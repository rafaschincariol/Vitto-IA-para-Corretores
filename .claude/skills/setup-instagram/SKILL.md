---
name: setup-instagram
description: >
  Configura a integração completa entre Claude Code e Instagram para publicação
  automática de carrosséis e posts. Guia o usuário passo a passo para obter
  credenciais da Meta API, salva tudo no lugar certo e testa a conexão.
  Use quando o usuário quiser conectar o Claude Code ao Instagram pela primeira vez,
  ou quando disser "quero publicar no Instagram", "configurar instagram", "setup instagram".
---

# Setup Instagram — Integração Automática com Claude Code

Configura tudo que é necessário para publicar posts e carrosséis automaticamente
no Instagram direto pelo Claude Code, sem abrir o Canva, sem copiar e colar nada.

---

## O que essa skill faz

1. Verifica os pré-requisitos
2. Guia para obter o token da Meta API (passo a passo com prints)
3. Descobre automaticamente o Instagram Business ID
4. Salva as credenciais no lugar certo
5. Instala o script de publicação
6. Testa a conexão ao vivo
7. Confirma que tudo está funcionando

**Tempo estimado: 10 minutos**

---

## ETAPA 0 — Boas-vindas e pré-requisitos

Ao ser invocada, apresente-se assim:

> Olá! Vou configurar tudo para você publicar no Instagram automaticamente pelo Claude Code.
> Preciso de uns 10 minutos do seu tempo e de algumas informações que só você tem acesso.
> Vamos juntos — eu te guio em cada passo.

Pergunte ao usuário:

**"Antes de começar, confirma pra mim:"**

1. Sua conta do Instagram é **Profissional** (Business ou Creator)?
   - Se não souber: Configurações → Conta → Tipo de conta
   - Se for pessoal: instrua a converter em Creator (gratuito, não perde seguidores)

2. Você tem uma **Página no Facebook** vinculada ao Instagram?
   - Se não tiver: instrua a criar uma página básica no Facebook

3. Você tem acesso ao **e-mail/senha do Facebook** que gerencia essa página?

Se tudo for sim → prosseguir para Etapa 1
Se algum não → resolver o item antes de continuar

---

## ETAPA 1 — Criar conta de desenvolvedor Meta (se necessário)

Instrua o usuário:

> "Vamos acessar o painel de desenvolvedores da Meta. É gratuito."

**Passos:**
1. Abra no navegador: `https://developers.facebook.com`
2. Clique em **"Começar"** ou **"Entrar"** (use o Facebook que tem a Página)
3. Se pedir para verificar identidade, confirme pelo celular
4. Quando entrar no painel, pergunte: **"Chegou no painel? Me fala o que está vendo na tela."**

---

## ETAPA 2 — Acessar o Graph API Explorer

Instrua o usuário:

> "Agora vamos usar uma ferramenta da Meta chamada Graph API Explorer. É aqui que a gente pega o token."

**Passos:**
1. Acesse: `https://developers.facebook.com/tools/explorer`
2. No canto superior direito, em **"Meta App"**, selecione um app existente
   - Se não tiver nenhum: clique em "Criar App" → tipo **Business** → preencha nome qualquer (ex: "MeuBot") → confirmar
3. Logo abaixo, em **"User or Page"**, clique e selecione **sua Página do Facebook** (não "Usuário")
4. Pergunte: **"Já selecionou a Página? Qual nome apareceu?"**

---

## ETAPA 3 — Adicionar permissões obrigatórias

Instrua o usuário:

> "Agora vamos adicionar as permissões para publicar no Instagram. Tem 3 que precisamos."

**No Graph API Explorer:**
1. Clique em **"Add a Permission"** (ou "Adicionar Permissão")
2. Busque e adicione uma por uma:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
3. Clique em **"Generate Access Token"** (Gerar Token de Acesso)
4. Uma janela do Facebook vai abrir pedindo autorização — clique em **Continuar** e **OK** em tudo
5. O token vai aparecer no campo de texto (começa com `EAAU...`)
6. Instrua: **"Copie esse token inteiro e cole aqui pra mim"**

> ⚠️ Avise: "Não compartilhe esse token com ninguém. Ele dá acesso à sua conta."

---

## ETAPA 4 — Receber e validar o token

Quando o usuário colar o token:

1. Verifique se começa com `EAA` e tem mais de 100 caracteres
2. Teste imediatamente com uma chamada de API — grave o token numa variável de
   ambiente antes de chamar o script, nunca interpole o valor direto num comando
   de shell:

```bash
export IG_TOKEN='TOKEN_DO_USUARIO_AQUI'
node -e "
fetch('https://graph.facebook.com/v19.0/me/accounts?fields=id,name,instagram_business_account&access_token=' + process.env.IG_TOKEN)
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d, null, 2)));
"
```

3. Se retornar dados → token válido, identificar qual conta é o Instagram do usuário
4. Se retornar erro → diagnose o problema:
   - `OAuthException` → token inválido, peça para gerar novamente
   - `permissions` → alguma permissão não foi adicionada, volte à Etapa 3

---

## ETAPA 5 — Identificar o Instagram Business ID

Após validar o token, do resultado da API:

1. Mostre as páginas encontradas em formato amigável:

```
Encontrei essas páginas vinculadas à sua conta:

1. [Nome da Página] → Instagram ID: XXXXXXXXX
2. [Outra Página]   → sem Instagram vinculado

Qual delas é a que você quer usar para publicar?
```

2. Confirme com o usuário qual conta usar
3. Guarde: `PAGE_TOKEN` e `INSTAGRAM_BUSINESS_ID`

---

## ETAPA 6 — Salvar as credenciais

Determine onde salvar com base no que existe no ambiente do usuário. Neste
repositório (`Vitto-IA-para-Corretores`, um app Next.js), o `.env*` já é
ignorado pelo git (ver `.gitignore` e `SECURITY.md`) — use essa mesma
convenção e nunca commite o arquivo gerado:

**Cenário A — Rodando dentro deste repositório:**
Salvar em: `.env.local` na raiz do projeto (padrão Next.js, já coberto pelo
`.gitignore`)

**Cenário B — Rodando fora de um projeto com repositório (uso local avulso):**
Criar pasta e salvar em: `~/claude-instagram/.env`

**Conteúdo do .env:**
```
# Instagram / Meta — Gerado pelo setup-instagram
INSTAGRAM_BUSINESS_ID=[ID encontrado]
FACEBOOK_PAGE_ID=[Page ID encontrado]
INSTAGRAM_ACCESS_TOKEN=[token do usuário]
META_API_VERSION=v19.0
```

Confirme: **"Credenciais salvas em [caminho]. Anotou esse caminho? É importante!"**

---

## ETAPA 7 — Instalar o script de publicação

Verifique se `publish_instagram.py` já existe no projeto:

```bash
find . -name "publish_instagram.py" -not -path "*/node_modules/*" 2>/dev/null | head -5
```

**Se não existir**, criar em `scripts/publish_instagram.py`:

```python
"""
publish_instagram.py — Publicação automática no Instagram via Meta Graph API
Gerado pelo setup-instagram skill do Claude Code
"""
import argparse, os, sys, time, requests
from pathlib import Path
from dotenv import load_dotenv

# Encontra o .env automaticamente (sobe até 3 níveis)
script_dir = Path(__file__).parent
for i in range(4):
    env_file = script_dir / (".." * i).rstrip("/") / ".env" if i > 0 else script_dir.parent / ".env"
    if env_file.exists():
        load_dotenv(env_file)
        break

IG_ID      = os.getenv("INSTAGRAM_BUSINESS_ID")
PAGE_TOKEN = os.getenv("INSTAGRAM_ACCESS_TOKEN")
BASE_URL   = f"https://graph.facebook.com/{os.getenv('META_API_VERSION', 'v19.0')}"


def host_image(image_path: str) -> str:
    """Hospeda imagem em URL pública via catbox.moe"""
    with open(image_path, "rb") as f:
        resp = requests.post(
            "https://catbox.moe/user/api.php",
            data={"reqtype": "fileupload"},
            files={"fileToUpload": (Path(image_path).name, f, "image/png")},
            timeout=60,
        )
    url = resp.text.strip()
    if not url.startswith("https://"):
        raise RuntimeError(f"Falha no upload: {url}")
    print(f"  Hospedada: {url}")
    return url


def create_media_container(image_path: str) -> str:
    resp = requests.post(f"{BASE_URL}/{IG_ID}/media", data={
        "access_token": PAGE_TOKEN,
        "image_url": host_image(image_path),
        "is_carousel_item": "true",
    }, timeout=60)
    result = resp.json()
    if "id" not in result:
        raise RuntimeError(f"Erro container: {result}")
    print(f"  Container: {result['id']}")
    return result["id"]


def create_carousel(media_ids: list, caption: str) -> str:
    resp = requests.post(f"{BASE_URL}/{IG_ID}/media", data={
        "access_token": PAGE_TOKEN,
        "media_type": "CAROUSEL",
        "children": ",".join(media_ids),
        "caption": caption,
    }, timeout=30)
    result = resp.json()
    if "id" not in result:
        raise RuntimeError(f"Erro carrossel: {result}")
    print(f"  Carrossel: {result['id']}")
    return result["id"]


def wait_ready(container_id: str) -> bool:
    for i in range(12):
        resp = requests.get(f"{BASE_URL}/{container_id}",
            params={"fields": "status_code", "access_token": PAGE_TOKEN}, timeout=15)
        status = resp.json().get("status_code", "")
        if status == "FINISHED":
            return True
        if status == "ERROR":
            raise RuntimeError(f"Container com erro: {resp.json()}")
        print(f"  Processando... {i*5}s")
        time.sleep(5)
    return False


def publish(container_id: str) -> str:
    resp = requests.post(f"{BASE_URL}/{IG_ID}/media_publish", data={
        "access_token": PAGE_TOKEN,
        "creation_id": container_id,
    }, timeout=30)
    result = resp.json()
    if "id" not in result:
        raise RuntimeError(f"Erro publicar: {result}")
    return result["id"]


def run(images: list, caption: str, dry_run: bool = False):
    if not IG_ID or not PAGE_TOKEN:
        print("ERRO: Credenciais nao encontradas. Rode /setup-instagram primeiro.")
        sys.exit(1)
    if len(images) < 2:
        print("ERRO: Minimo 2 imagens para carrossel.")
        sys.exit(1)
    if len(images) > 10:
        print("ERRO: Maximo 10 imagens.")
        sys.exit(1)

    print(f"\nPublicando {len(images)} slides no Instagram...")
    if dry_run:
        print("[DRY RUN] Tudo OK. Remova --dry-run para publicar.")
        return

    print("\nPasso 1/3 - Criando containers...")
    ids = [create_media_container(img) for img in images]

    print("\nPasso 2/3 - Montando carrossel...")
    carousel_id = create_carousel(ids, caption)

    print("\nPasso 3/3 - Publicando...")
    if not wait_ready(carousel_id):
        print("ERRO: Timeout no processamento.")
        sys.exit(1)

    post_id = publish(carousel_id)
    print(f"\nPublicado com sucesso!")
    print(f"Post ID: {post_id}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--images", nargs="+", required=True)
    parser.add_argument("--caption", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    run(args.images, args.caption, args.dry_run)
```

**Instalar dependências:**
```bash
pip install requests python-dotenv -q
```

---

## ETAPA 8 — Teste de conexão ao vivo

Execute o teste final (token via variável de ambiente, nunca literal no comando):

```bash
export IG_TOKEN='TOKEN_SALVO'
export IG_ID='IG_ID_SALVO'
node -e "
fetch('https://graph.facebook.com/v19.0/' + process.env.IG_ID + '?fields=id,name,username&access_token=' + process.env.IG_TOKEN)
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d, null, 2)));
"
```

Se retornar `username`, mostre para o usuário:

```
Conexao testada com sucesso!

Conta conectada: @[username]
Nome: [name]
ID: [id]

Tudo pronto para publicar automaticamente.
```

---

## ETAPA 9 — Confirmação final e próximos passos

Mostre o resumo completo:

```
Setup concluido!

O que foi configurado:
  Credenciais salvas em: [caminho do .env]
  Script de publicacao:  [caminho do publish_instagram.py]
  Conta conectada:       @[username]

Como usar agora:

1. Criar carrossel:
   /instagram-carousel

2. Exportar os slides:
   python export_slides.py

3. Publicar no Instagram:
   python publish_instagram.py --images slides/*.png --caption "sua legenda"

Ou peça tudo de uma vez:
   "Crie um carrossel sobre [tema] e publique no meu Instagram"
```

---

## Diagnóstico de erros comuns

| Erro | Causa | Solução |
|------|-------|---------|
| `OAuthException #200` | Permissões faltando | Voltar ao Graph API Explorer e adicionar as 3 permissões |
| `OAuthException #100 image_url required` | API não aceita arquivo local | O script já resolve via catbox.moe |
| `Invalid OAuth access token` | Token expirado | Gerar novo token no Graph API Explorer |
| `Instagram account not found` | Conta não é Business/Creator | Converter conta em Configurações → Conta |
| `Pages not found` | Página não vinculada ao Instagram | Vincular em Configurações do Instagram → Conta → Página vinculada |

---

## Importante sobre o token

O token gerado no Graph API Explorer **expira em 1 hora**.

Para uso em produção, instrua o usuário a gerar um **token de longa duração**:

```bash
curl "https://graph.facebook.com/v19.0/oauth/access_token" \
  --data-urlencode "grant_type=fb_exchange_token" \
  --data-urlencode "client_id=${APP_ID}" \
  --data-urlencode "client_secret=${APP_SECRET}" \
  --data-urlencode "fb_exchange_token=${TOKEN_ATUAL}"
```

Ou instrua: "Me fala quando o token expirar que eu gero um novo pra você em 1 minuto."

---

## Segurança

- O token de acesso é uma credencial sensível: nunca ecoe o valor completo de
  volta no chat, nunca o grave em log, e nunca o interpole diretamente numa
  string de comando de shell — sempre passe por variável de ambiente.
- `INSTAGRAM_ACCESS_TOKEN` e as demais credenciais vivem só em `.env*`, que já
  está no `.gitignore` deste projeto — confirme que o arquivo nunca é
  adicionado a um commit.
- `catbox.moe` é um host de imagens público e anônimo: qualquer imagem
  enviada por ele fica acessível a quem tiver o link. Use apenas para o
  material de marketing que já será publicado no Instagram — nunca para fotos
  de imóveis, documentos ou qualquer conteúdo de cliente que não deva ficar
  público.
