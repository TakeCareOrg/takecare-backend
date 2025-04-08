export default {
    "/quiz-data/{type}": {
        get: {
            summary: "Obtention des données de quiz.",
            description:
                "Permet à l'utilisateur de récupérer les données pour un type de quiz spécifique.",
            security: [
                {
                    bearerAuth: [],
                },
            ],
            parameters: [
                {
                    name: "type",
                    in: "path",
                    required: true,
                    description: "Type de quiz demandé",
                    schema: {
                        type: "string",
                        enum: [
                            "allergies",
                            "chronic_illnesses",
                            "medical_jobs",
                            "sports",
                            "surgical_interventions",
                        ],
                    },
                },
                {
                    name: "lang",
                    in: "query",
                    required: false,
                    description:
                        "Langue souhaitée pour les données (par défaut 'en')",
                    schema: {
                        type: "string",
                        enum: ["en", "fr"],
                        default: "en",
                    },
                },
                {
                    name: "Authorization",
                    in: "header",
                    required: true,
                    description: "Bearer token d'authentification",
                    schema: {
                        type: "string",
                        example:
                            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    },
                },
            ],
            responses: {
                200: {
                    description: "Données du quiz récupérées avec succès.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    "{type}": {
                                        type: "array",
                                        items: {
                                            type: "string",
                                        },
                                        description:
                                            "Liste des options disponibles pour le type de quiz demandé dans la langue spécifiée",
                                    },
                                },
                                example: {
                                    surgical_interventions: [
                                        "Appendectomy",
                                        "Cholecystectomy",
                                        "Herniorrhaphy",
                                        "Gastrectomy",
                                        "Colectomy",
                                        "Intestinal Resection",
                                    ],
                                },
                            },
                        },
                    },
                },
                400: {
                    description: "Type de quiz manquant.",
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
                                    message: "MISSING_DATA_FILE_TYPE",
                                },
                            },
                        },
                    },
                },
                403: {
                    description: "Authentification requise.",
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
                                    message: "UNAUTHORIZED",
                                },
                            },
                        },
                    },
                },
                500: {
                    description:
                        "Erreur interne du serveur ou fichier non trouvé.",
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
                                    message: "FILE_NOT_FOUND",
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};
