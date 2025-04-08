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
};
