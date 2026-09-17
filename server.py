from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote_plus, unquote, urlparse
from urllib.request import Request, urlopen
import html
import json
import re
import socket


PORT = 4173
VENDOR_DOMAINS = [
    "quirumed.com",
    "iberomed.es",
    "materialmedico24.es",
    "materialmedico.com",
    "promofarma.com",
    "medicalexpo.es",
    "medline.eu",
    "herraiz.com",
    "salunatur.com",
    "ortoweb.com",
    "farmaciasdirect.com",
    "axalotiene.com",
]
BLOCKED_IMAGE_DOMAINS = ["facebook.com", "fbcdn.net", "lookaside.fbsbx.com", "pinterest.", "instagram.", "youtube."]
PREFERRED_SALE_WORDS = [
    "medic",
    "sanitar",
    "farmacia",
    "ortopedia",
    "quiru",
    "salud",
    "clinical",
    "hospital",
    "producto",
    "tienda",
]


def fetch_text(url, timeout=10):
    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 MaterialDocente/1.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    )
    with urlopen(request, timeout=timeout) as response:
        raw = response.read(800000)
        content_type = response.headers.get("content-type", "")
    encoding = "utf-8"
    match = re.search(r"charset=([\w-]+)", content_type)
    if match:
        encoding = match.group(1)
    return raw.decode(encoding, errors="ignore")


def fetch_bytes(url, timeout=12):
    request = Request(url, headers={"User-Agent": "Mozilla/5.0 MaterialDocente/1.0"})
    with urlopen(request, timeout=timeout) as response:
        content_type = response.headers.get("content-type", "image/jpeg")
        return response.read(1500000), content_type


def clean_text(value):
    value = re.sub(r"<[^>]+>", " ", value or "")
    value = html.unescape(value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def absolute_url(base, value):
    if not value:
        return ""
    if value.startswith("//"):
        return "https:" + value
    if value.startswith("http://") or value.startswith("https://"):
        return value
    parsed = urlparse(base)
    if value.startswith("/"):
        return f"{parsed.scheme}://{parsed.netloc}{value}"
    path = parsed.path.rsplit("/", 1)[0]
    return f"{parsed.scheme}://{parsed.netloc}{path}/{value}"


def infer_category(query, requested=""):
    text = f"{query} {requested}".lower()
    if any(word in text for word in ["cardio", "corazon", "circulator", "vascular", "tension", "tensiometro", "pulso", "fonendo", "estetosc"]):
        return "Circulatorio"
    if any(word in text for word in ["respir", "oxigen", "mascarilla", "ffp", "nebul", "ambu", "canula", "via aerea"]):
        return "Respiratorio"
    if any(word in text for word in ["pedi", "infantil", "nino", "neonato", "bebe"]):
        return "Pediatrico"
    return "Otros"


def brief_description(query, category, source_text=""):
    text = f"{query} {source_text}".lower()
    if "guante" in text:
        return "Guante sanitario desechable para proteger las manos durante practicas y procedimientos."
    if "mascarilla" in text or "ffp" in text:
        return "Mascarilla de proteccion respiratoria para practicas de higiene, aislamiento o seguridad."
    if "fonendo" in text or "estetosc" in text:
        return "Instrumento de auscultacion para practicar la escucha de sonidos cardiacos y respiratorios."
    if "sonda" in text:
        return "Sonda sanitaria para entrenar tecnicas de cuidados, higiene y procedimientos."
    if "jering" in text:
        return "Dispositivo para practicar preparacion, carga y administracion simulada de medicacion."
    if "venda" in text or "aposito" in text:
        return "Material de cura para entrenar vendajes, proteccion y cobertura de lesiones simuladas."
    labels = {
        "Circulatorio": "Material circulatorio para practicas de constantes, auscultacion o valoracion vascular.",
        "Respiratorio": "Material respiratorio para practicas de oxigenoterapia, proteccion o via aerea.",
        "Pediatrico": "Material pediatrico para practicas docentes con pacientes infantiles o simuladores.",
        "Otros": "Material sanitario de uso docente para practicas y procedimientos.",
    }
    return labels.get(category, labels["Otros"])


def search_vendor_pages(query):
    vendor_filter = " OR ".join(f"site:{domain}" for domain in VENDOR_DOMAINS)
    url = f"https://duckduckgo.com/html/?q={quote_plus(query + ' material sanitario comprar ' + vendor_filter)}"
    page = fetch_text(url)
    links = []
    for match in re.finditer(r'class="result__a"[^>]+href="([^"]+)"', page):
        href = html.unescape(match.group(1))
        parsed = urlparse(href)
        if "duckduckgo.com" in parsed.netloc:
            qs = parse_qs(parsed.query)
            href = qs.get("uddg", [href])[0]
        host = urlparse(href).netloc.replace("www.", "")
        if any(domain in host for domain in VENDOR_DOMAINS) and href not in links:
            links.append(href)
        if len(links) >= 5:
            break
    return links


def search_product_image(query):
    search_query = f"{query} material sanitario venta producto"
    page = fetch_text(f"https://duckduckgo.com/?q={quote_plus(search_query)}")
    vqd = first_match(page, r"vqd=([\d-]+)&")
    if not vqd:
        return None
    image_url = (
        "https://duckduckgo.com/i.js?"
        f"l=es-es&o=json&q={quote_plus(search_query)}&vqd={vqd}&f=,,,&p=1"
    )
    request = Request(
        image_url,
        headers={
            "User-Agent": "Mozilla/5.0 MaterialDocente/1.0",
            "Accept": "application/json",
            "Referer": "https://duckduckgo.com/",
        },
    )
    with urlopen(request, timeout=10) as response:
        payload = json.loads(response.read(300000).decode("utf-8", errors="ignore"))
    candidates = []
    query_tokens = product_tokens(query)
    for result in payload.get("results", []):
        image = result.get("image") or result.get("thumbnail")
        landing = result.get("url") or image
        if not image:
            continue
        host = urlparse(landing).netloc.replace("www.", "").lower()
        image_host = urlparse(image).netloc.replace("www.", "").lower()
        combined = f"{host} {image_host} {result.get('title', '')}".lower()
        if any(blocked in combined for blocked in BLOCKED_IMAGE_DOMAINS):
            continue
        tokens = product_tokens(result.get("title", "") + " " + landing)
        token_score = len(query_tokens.intersection(tokens))
        sale_score = sum(1 for word in PREFERRED_SALE_WORDS if word in combined)
        domain_score = 4 if any(domain in host for domain in VENDOR_DOMAINS) else 0
        if token_score == 0:
            continue
        candidates.append((domain_score + sale_score + token_score, {
            "image": image,
            "url": landing,
            "title": clean_text(result.get("title", "")),
            "source": urlparse(landing).netloc.replace("www.", ""),
        }))
    if candidates:
        candidates.sort(key=lambda entry: entry[0], reverse=True)
        return candidates[0][1]
    return None


def product_tokens(value):
    stop = {"de", "del", "la", "el", "los", "las", "para", "con", "sin", "talla", "caja", "uds", "unidad", "unidades", "material", "sanitario", "venta", "producto"}
    words = re.findall(r"[a-záéíóúñ0-9]{4,}", value.lower())
    return {word for word in words if word not in stop}


def extract_product_from_page(url):
    page = fetch_text(url)
    title = clean_text(first_match(page, r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)'))
    description = clean_text(first_match(page, r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)'))
    image = first_match(page, r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)')
    if not image:
        image = first_match(page, r'<img[^>]+(?:class|id)=["\'][^"\']*(?:product|image|main)[^"\']*["\'][^>]+src=["\']([^"\']+)')
    if not image:
        image = first_match(page, r'<img[^>]+src=["\']([^"\']+)')
    image = absolute_url(url, html.unescape(image or ""))
    return {
        "title": title,
        "description": description,
        "image": image,
        "url": url,
    }


def first_match(text, pattern):
    match = re.search(pattern, text, flags=re.I | re.S)
    return match.group(1) if match else ""


def product_info(query, requested_category):
    search_query = normalize_product_query(query)
    category = infer_category(search_query, requested_category)
    for url in search_vendor_pages(search_query):
        try:
            product = extract_product_from_page(url)
        except Exception:
            continue
        if product["image"]:
            return {
                "ok": True,
                "title": product["title"] or search_query,
                "description": brief_description(search_query, category, product["description"]),
                "imageUrl": f"/api/image?url={quote_plus(product['image'])}",
                "sourceUrl": product["url"],
                "imageSource": urlparse(product["url"]).netloc.replace("www.", ""),
                "category": category,
            }
    try:
        image = search_product_image(search_query)
    except Exception:
        image = None
    if image:
        return {
            "ok": True,
            "title": image["title"] or search_query,
            "description": brief_description(search_query, category, image["title"]),
            "imageUrl": f"/api/image?url={quote_plus(image['image'])}",
            "sourceUrl": image["url"],
            "imageSource": image["source"] or "Busqueda de producto",
            "category": category,
        }
    return {
        "ok": True,
        "title": search_query,
        "description": brief_description(search_query, category),
        "imageUrl": "",
        "sourceUrl": "",
        "imageSource": "",
        "category": category,
    }


def normalize_product_query(query):
    text = clean_text(query).lower()
    replacements = {
        "fonendos": "fonendoscopio",
        "fonendo": "fonendoscopio",
        "estetoscopios": "estetoscopio",
        "mascarillas": "mascarilla",
    }
    for old, new in replacements.items():
        text = re.sub(rf"\b{old}\b", new, text)
    text = re.sub(r"\b(de practica|practica|entrenamiento|docente|simulacion)\b", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text or query


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/product-info":
            params = parse_qs(parsed.query)
            query = params.get("q", [""])[0].strip()
            category = params.get("category", [""])[0].strip()
            if not query:
                self.send_json({"ok": False, "error": "Falta el nombre del producto"}, status=400)
                return
            try:
                self.send_json(product_info(query, category))
            except Exception as exc:
                self.send_json({"ok": False, "error": str(exc)}, status=500)
            return

        if parsed.path == "/api/image":
            image_url = unquote(parse_qs(parsed.query).get("url", [""])[0])
            if not image_url.startswith(("http://", "https://")):
                self.send_error(400)
                return
            try:
                body, content_type = fetch_bytes(image_url)
                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.send_header("Cache-Control", "public, max-age=86400")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except Exception:
                self.send_error(404)
            return

        return super().do_GET()

    def send_json(self, value, status=200):
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    socket.setdefaulttimeout(12)
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Material Docente Sanitario en http://127.0.0.1:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
