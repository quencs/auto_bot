# Configuration du workflow n8n — Teemate Tickets → GitHub Issues

## Prérequis

- n8n installé et accessible (ex: `http://<NAS_IP>:5678`)
- Un repo GitHub cible pour les issues
- Un Personal Access Token GitHub avec le scope `repo`

## 1. Créer le workflow

Dans n8n, créer un nouveau workflow nommé **"Teemate Tickets → GitHub Issues"**.

## 2. Node 1 — Webhook

| Paramètre | Valeur |
|---|---|
| HTTP Method | `POST` |
| Path | `teemate-tickets` |
| Respond | `Immediately` |

L'URL résultante sera : `http://<NAS_IP>:5678/webhook/teemate-tickets`

> Copier cette URL dans le `.env` du bot : `N8N_WEBHOOK_URL=http://<NAS_IP>:5678/webhook/teemate-tickets`

### Payload reçu

```json
{
  "category": "app-issue",
  "title": "Le bouton X ne marche pas",
  "description": "Quand je clique sur le bouton X, rien ne se passe.",
  "steps": "1. Aller sur la page Y\n2. Cliquer sur X\n3. Rien ne se passe",
  "labels": ["bug", "app"],
  "user": {
    "id": "123456789",
    "username": "jean",
    "displayName": "Jean Dupont"
  },
  "guildId": "987654321",
  "timestamp": "2026-02-16T14:30:00.000Z"
}
```

- `steps` est `null` pour les suggestions (catégories `app-suggestion`, `discord-suggestion`)
- `labels` contient toujours 2 valeurs : le type (`bug`/`enhancement`) + la source (`app`/`discord`)

## 3. Node 2 — Code (formater le body de l'issue)

Ajouter un node **Code** pour construire le body Markdown de l'issue GitHub.

```js
const item = $input.first().json;

const user = item.user || {};
const sections = [
  `## Description\n\n${item.description || 'N/A'}`,
];

if (item.steps) {
  sections.push(`## Étapes de reproduction\n\n${item.steps}`);
}

sections.push(
  `## Informations`,
  `- **Auteur Discord :** ${user.displayName || user.username || 'Inconnu'} (\`${user.username || '?'}\` / \`${user.id || '?'}\`)`,
  `- **Serveur :** \`${item.guildId || '?'}\``,
  `- **Catégorie :** \`${item.category || '?'}\``,
  `- **Date :** ${item.timestamp || new Date().toISOString()}`,
);

return [{
  json: {
    title: `[${item.category}] ${item.title}`,
    body: sections.join('\n\n'),
    labels: item.labels || [],
  }
}];
```

## 4. Node 3 — GitHub (créer l'issue)

Ajouter un node **GitHub**.

| Paramètre | Valeur |
|---|---|
| Resource | `Issue` |
| Operation | `Create` |
| Repository Owner | `<ton-org-ou-username>` |
| Repository Name | `<ton-repo>` |
| Title | `{{ $json.title }}` |
| Body | `{{ $json.body }}` |
| Labels | `{{ $json.labels }}` |

### Credentials GitHub

1. Dans n8n, aller dans **Credentials → Add Credential → GitHub API**
2. Choisir **Access Token**
3. Coller le Personal Access Token GitHub (scope `repo` requis)
4. Sauvegarder et sélectionner ce credential dans le node

## 5. Connexions

```
[Webhook] → [Code] → [GitHub]
```

## 6. Activer le workflow

Cliquer sur le toggle **Active** en haut à droite du workflow.

## Vérification

1. **Test manuel** — Dans n8n, cliquer sur "Test Workflow", puis envoyer un POST avec curl :
   ```bash
   curl -X POST http://<NAS_IP>:5678/webhook-test/teemate-tickets \
     -H "Content-Type: application/json" \
     -d '{
       "category": "app-issue",
       "title": "Test ticket",
       "description": "Ceci est un test.",
       "steps": null,
       "labels": ["bug", "app"],
       "user": {"id": "123", "username": "test", "displayName": "Test"},
       "guildId": "456",
       "timestamp": "2026-02-16T00:00:00.000Z"
     }'
   ```
2. Vérifier que l'issue apparaît dans le repo GitHub avec les bons labels
3. **Test depuis Discord** — Utiliser le bouton "Ouvrir un ticket" dans le channel configuré, soumettre un ticket, et vérifier l'issue créée

## Réseau

Le bot Discord tourne dans un container Docker et n8n sur le NAS. L'URL du webhook doit utiliser l'IP locale du NAS (pas `localhost`), car les deux stacks Docker sont séparées.

```
N8N_WEBHOOK_URL=http://192.168.x.x:5678/webhook/teemate-tickets
```
