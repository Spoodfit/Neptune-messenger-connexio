# Modèle de menace Connexio

## Actifs sensibles

- identité Neptune et rôle ;
- refresh tokens et tickets temps réel ;
- contenu des messages, médias et vocaux ;
- liste des membres et groupes privés ;
- accusés de lecture et présence ;
- position, même approximative ;
- signalements et décisions de modération.

## Menaces prioritaires et contrôles

| Menace | Contrôle obligatoire |
|---|---|
| Téléphone perdu | refresh token dans SecureStore, révocation distante, base locale SQLCipher |
| Rejeu d'un message | `client_message_id` unique et contrainte serveur |
| Double envoi après reconnexion | outbox persistante, idempotence et réconciliation REST/temps réel |
| Accès à un groupe après exclusion | autorisation serveur à chaque lecture/écriture et événement de révocation |
| JWT exposé dans URL WebSocket | ticket à durée courte, usage unique |
| Fuite dans les logs | redaction récursive des tokens, corps, codes et secrets |
| Push visible sur écran verrouillé | contenu minimal, préférence utilisateur et catégorie privée |
| Spam ou harcèlement | rate limiting, blocage, signalement, suspension et audit administrateur |
| Position trop précise | obfuscation serveur, durée de conservation, Ghost Mode réel |
| Fichier hostile | limites MIME/taille, antivirus, stockage privé et URL signée |
| Backend indisponible | cache lecture, outbox chiffrée, retry borné et état d'échec visible |

## Hypothèses refusées

- le client mobile n'est jamais une source de vérité ;
- masquer un bouton ne constitue pas une autorisation ;
- HTTPS seul ne protège pas un jeton stocké ou journalisé ;
- une notification push n'est pas un canal de transport fiable du message ;
- le chiffrement de bout en bout ne doit jamais être revendiqué sans protocole audité et gestion complète des clés.
