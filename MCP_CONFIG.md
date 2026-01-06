# Configuration MCP pour MUI

Ce document explique comment configurer le Model Context Protocol (MCP) pour MUI dans Cursor/Windsurf.

## Installation

Le MCP MUI permet à l'assistant IA d'accéder à la documentation officielle de MUI et aux exemples de code, garantissant des réponses précises et à jour.

## Configuration dans Cursor/Windsurf

### Étapes :

1. **Ouvrez les paramètres de Cursor/Windsurf**
   - Sur macOS : `Cmd + ,` ou via le menu "Settings"
   - Sur Windows/Linux : `Ctrl + ,` ou via le menu "Settings"

2. **Naviguez vers la configuration MCP**
   - Allez dans "Settings" -> "MCP" -> "Add Server"

3. **Ajoutez la configuration suivante :**

```json
{
  "mcp": {
    "servers": {
      "mui-mcp": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@mui/mcp@latest"]
      }
    }
  }
}
```

### Configuration complète pour `.cursor/mcp.json` (si applicable) :

Si votre version de Cursor utilise un fichier de configuration, créez ou modifiez `.cursor/mcp.json` :

```json
{
  "mcp": {
    "servers": {
      "mui-mcp": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "@mui/mcp@latest"]
      }
    }
  }
}
```

## Test de l'installation

Pour tester le MCP dans l'inspecteur MCP, exécutez :

```bash
npx -y @mui/mcp@latest
```

## Avantages

- Réponses précises basées sur la documentation officielle MUI
- Liens vers la documentation réelle (pas de 404)
- Code des composants provenant des registres officiels
- Accès aux dernières versions et mises à jour

## Documentation officielle

Pour plus de détails, exemples et dépannage :
- [Documentation MUI MCP](https://mui.com/x/introduction/mcp/)
- [Documentation officielle MCP](https://modelcontextprotocol.io/)

## Notes

- Le serveur MCP s'exécute localement
- La communication se fait via le transport `stdio`
- Le package `@mui/mcp` sera téléchargé automatiquement lors de la première utilisation


