export default {
    "/chat/new-message": {
        post: {
            summary: "Envoi d'un nouveau message au chatbot.",
            description:
                "Permet à l'utilisateur d'envoyer un nouveau message et recevoir une réponse.",
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
                            required: ["messages"],
                            properties: {
                                messages: {
                                    type: "array",
                                    description:
                                        "Liste des messages précédents et du nouveau message.",
                                    items: {
                                        type: "object",
                                        properties: {
                                            role: {
                                                type: "string",
                                                enum: ["user", "assistant"],
                                                description:
                                                    "Rôle de l'émetteur du message.",
                                            },
                                            content: {
                                                type: "string",
                                                description:
                                                    "Contenu du message.",
                                            },
                                        },
                                    },
                                },
                            },
                            example: {
                                messages: [
                                    {
                                        role: "user",
                                        content:
                                            "Bonjour, j'aimerais des conseils pour mon régime alimentaire.",
                                    },
                                ],
                            },
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "Message envoyé et réponse reçue avec succès.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    chat: {
                                        type: "object",
                                        properties: {
                                            message: {
                                                type: "object",
                                                properties: {
                                                    role: {
                                                        type: "string",
                                                        description:
                                                            "Rôle de l'assistant.",
                                                    },
                                                    content: {
                                                        type: "string",
                                                        description:
                                                            "Contenu de la réponse.",
                                                    },
                                                },
                                            },
                                            tokens_used: {
                                                type: "number",
                                                description:
                                                    "Nombre de jetons utilisés pour cette conversation.",
                                            },
                                            tokens_remaining: {
                                                type: "number",
                                                description:
                                                    "Nombre de jetons restants pour l'utilisateur.",
                                            },
                                        },
                                    },
                                },
                                example: {
                                    chat: {
                                        message: {
                                            role: "assistant",
                                            content:
                                                "Bonjour! Je serais ravi de vous aider avec votre régime alimentaire. Pourriez-vous me donner plus de détails sur vos objectifs et vos habitudes alimentaires actuelles?",
                                        },
                                        tokens_used: 1,
                                        tokens_remaining: 9,
                                    },
                                },
                            },
                        },
                    },
                },
                400: {
                    description: "Messages manquants ou vides.",
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
                                    message: "INTERNAL_SERVER_ERROR",
                                },
                            },
                        },
                    },
                },
            },
        },
    },
};
