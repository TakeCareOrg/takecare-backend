export default {
    "/auth/register": {
        post: {
            summary: "Inscription d'un nouvel utilisateur.",
            description:
                "Permet de créer un nouvel utilisateur dans le système et d'envoyer un email de vérification.",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["email", "password"],
                            properties: {
                                email: {
                                    type: "string",
                                    format: "email",
                                    description:
                                        "Adresse email de l'utilisateur.",
                                },
                                password: {
                                    type: "string",
                                    format: "password",
                                    description:
                                        "Mot de passe de l'utilisateur.",
                                },
                            },
                            example: {
                                email: "john.doe@gmail.com",
                                password: "monmotdepasse123",
                            },
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "Utilisateur créé avec succès.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    token: {
                                        type: "string",
                                        description:
                                            "Token JWT pour authentifier l'utilisateur.",
                                    },
                                },
                                example: {
                                    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                                },
                            },
                        },
                    },
                },
                400: {
                    description: "Informations d'inscription incomplètes.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    message: {
                                        type: "string",
                                    },
                                },
                                example: {
                                    message: "Missing required fields",
                                },
                            },
                        },
                    },
                },
                500: {
                    description: "Erreur interne du serveur.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    message: {
                                        type: "string",
                                    },
                                },
                                example: {
                                    message: "Internal server error",
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    "/auth/login": {
        post: {
            summary: "Connexion utilisateur.",
            description:
                "Permet à un utilisateur de se connecter avec son email et son mot de passe.",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["email", "password"],
                            properties: {
                                email: {
                                    type: "string",
                                    format: "email",
                                    description:
                                        "Adresse email de l'utilisateur.",
                                },
                                password: {
                                    type: "string",
                                    format: "password",
                                    description:
                                        "Mot de passe de l'utilisateur.",
                                },
                            },
                            example: {
                                email: "john.doe@gmail.com",
                                password: "monmotdepasse123",
                            },
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "Connexion réussie.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    token: {
                                        type: "string",
                                        description:
                                            "Token JWT pour authentifier l'utilisateur.",
                                    },
                                },
                                example: {
                                    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                                },
                            },
                        },
                    },
                },
                400: {
                    description: "Informations de connexion incomplètes.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    message: {
                                        type: "string",
                                    },
                                },
                                example: {
                                    message: "Missing required fields",
                                },
                            },
                        },
                    },
                },
                500: {
                    description: "Erreur interne du serveur.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    message: {
                                        type: "string",
                                    },
                                },
                                example: {
                                    message: "Internal server error",
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    "/auth/verify-email": {
        post: {
            summary: "Vérification d'adresse email.",
            description:
                "Permet de vérifier l'adresse email d'un utilisateur à l'aide d'un code envoyé par email.",
            security: [
                {
                    bearerAuth: [],
                },
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["code"],
                            properties: {
                                code: {
                                    type: "string",
                                    description:
                                        "Code de vérification à 6 chiffres envoyé à l'adresse email de l'utilisateur.",
                                },
                            },
                            example: {
                                code: "123456",
                            },
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "Résultat de la vérification.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    verified: {
                                        type: "boolean",
                                        description:
                                            "Indique si la vérification a réussi.",
                                    },
                                },
                                example: {
                                    verified: true,
                                },
                            },
                        },
                    },
                },
                400: {
                    description: "Code de vérification manquant.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    message: {
                                        type: "string",
                                    },
                                },
                                example: {
                                    message: "Missing required fields",
                                },
                            },
                        },
                    },
                },
                401: {
                    description: "Utilisateur non authentifié.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    message: {
                                        type: "string",
                                    },
                                },
                                example: {
                                    message: "Unauthorized",
                                },
                            },
                        },
                    },
                },
                500: {
                    description: "Erreur interne du serveur.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    message: {
                                        type: "string",
                                    },
                                },
                                example: {
                                    message: "Internal server error",
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    "/auth/forgot-password": {
        post: {
            summary: "Demande de réinitialisation du mot de passe.",
            description:
                "Envoie un code de réinitialisation à l'adresse email fournie. Retourne toujours un succès pour éviter l'énumération des utilisateurs.",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["email"],
                            properties: {
                                email: {
                                    type: "string",
                                    format: "email",
                                    description:
                                        "Adresse email du compte à réinitialiser.",
                                },
                            },
                            example: {
                                email: "john.doe@gmail.com",
                            },
                        },
                    },
                },
            },
            responses: {
                200: {
                    description:
                        "Demande traitée avec succès (retourné même si l'email n'existe pas).",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    message: {
                                        type: "string",
                                    },
                                },
                                example: {
                                    message:
                                        "If an account with that email exists, a reset code has been sent",
                                },
                            },
                        },
                    },
                },
                400: {
                    description: "Email invalide ou manquant.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    message: {
                                        type: "string",
                                    },
                                },
                                example: {
                                    message: "Invalid email address",
                                },
                            },
                        },
                    },
                },
                500: {
                    description: "Erreur interne du serveur.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    message: {
                                        type: "string",
                                    },
                                },
                                example: {
                                    message: "Internal server error",
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    "/auth/verify-reset-code": {
        post: {
            summary: "Vérification du code de réinitialisation.",
            description:
                "Vérifie le code de réinitialisation envoyé par email. Si le code est valide, retourne un token JWT temporaire permettant de réinitialiser le mot de passe.",
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["email", "code"],
                            properties: {
                                email: {
                                    type: "string",
                                    format: "email",
                                    description: "Adresse email du compte.",
                                },
                                code: {
                                    type: "string",
                                    description:
                                        "Code de réinitialisation à 6 chiffres envoyé par email.",
                                },
                            },
                            example: {
                                email: "john.doe@gmail.com",
                                code: "123456",
                            },
                        },
                    },
                },
            },
            responses: {
                200: {
                    description:
                        "Code vérifié avec succès. Retourne un token JWT temporaire.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    token: {
                                        type: "string",
                                        description:
                                            "Token JWT temporaire pour réinitialiser le mot de passe.",
                                    },
                                },
                                example: {
                                    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                                },
                            },
                        },
                    },
                },
                400: {
                    description:
                        "Données invalides ou code de réinitialisation invalide/expiré.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    message: {
                                        type: "string",
                                    },
                                },
                                example: {
                                    message: "Invalid or expired reset code",
                                },
                            },
                        },
                    },
                },
                500: {
                    description: "Erreur interne du serveur.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    message: {
                                        type: "string",
                                    },
                                },
                                example: {
                                    message: "Internal server error",
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    "/auth/reset-password": {
        post: {
            summary: "Réinitialisation du mot de passe.",
            description:
                "Permet de définir un nouveau mot de passe en utilisant le token JWT obtenu via la vérification du code de réinitialisation.",
            security: [
                {
                    bearerAuth: [],
                },
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            required: ["password"],
                            properties: {
                                password: {
                                    type: "string",
                                    format: "password",
                                    minLength: 6,
                                    maxLength: 64,
                                    description:
                                        "Nouveau mot de passe (entre 6 et 64 caractères).",
                                },
                            },
                            example: {
                                password: "nouveaumotdepasse123",
                            },
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "Mot de passe réinitialisé avec succès.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    message: {
                                        type: "string",
                                    },
                                },
                                example: {
                                    message:
                                        "Password has been reset successfully",
                                },
                            },
                        },
                    },
                },
                400: {
                    description: "Mot de passe invalide.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    message: {
                                        type: "string",
                                    },
                                },
                                example: {
                                    message:
                                        "Password must be at least 6 characters",
                                },
                            },
                        },
                    },
                },
                401: {
                    description: "Token JWT manquant ou invalide.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    message: {
                                        type: "string",
                                    },
                                },
                                example: {
                                    message: "Unauthorized",
                                },
                            },
                        },
                    },
                },
                404: {
                    description: "Utilisateur non trouvé.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    message: {
                                        type: "string",
                                    },
                                },
                                example: {
                                    message: "User not found",
                                },
                            },
                        },
                    },
                },
                500: {
                    description: "Erreur interne du serveur.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    message: {
                                        type: "string",
                                    },
                                },
                                example: {
                                    message: "Internal server error",
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};
