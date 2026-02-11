export default {
    "/admin/login": {
        post: {
            summary: "Connexion administrateur.",
            description:
                "Permet à un administrateur de se connecter avec son email et son mot de passe.",
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
                                        "Adresse email de l'administrateur.",
                                },
                                password: {
                                    type: "string",
                                    format: "password",
                                    description:
                                        "Mot de passe de l'administrateur.",
                                },
                            },
                            example: {
                                email: "admin@takecare.com",
                                password: "motdepasse123",
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
                                            "Token JWT pour authentifier l'administrateur.",
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
                401: {
                    description: "Identifiants invalides.",
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
                                    message: "Invalid email or password",
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
    "/admin/me": {
        get: {
            summary: "Récupération des informations de l'administrateur.",
            description:
                "Renvoie les informations de l'administrateur authentifié basé sur le token JWT.",
            security: [
                {
                    bearerAuth: [],
                },
            ],
            responses: {
                200: {
                    description:
                        "Informations administrateur récupérées avec succès.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    user: {
                                        type: "object",
                                        properties: {
                                            user_id: {
                                                type: "string",
                                                description:
                                                    "Identifiant unique de l'administrateur.",
                                            },
                                            email: {
                                                type: "string",
                                                description:
                                                    "Email de l'administrateur.",
                                            },
                                            first_name: {
                                                type: "string",
                                                description:
                                                    "Prénom de l'administrateur.",
                                            },
                                            last_name: {
                                                type: "string",
                                                description:
                                                    "Nom de famille de l'administrateur.",
                                            },
                                            verified: {
                                                type: "boolean",
                                                description:
                                                    "Statut de vérification de l'email.",
                                            },
                                            role: {
                                                type: "string",
                                                description:
                                                    "Rôle de l'utilisateur (admin).",
                                            },
                                        },
                                    },
                                },
                                example: {
                                    user: {
                                        user_id:
                                            "46ba028c-7809-496b-979f-90c7f5884dbb",
                                        email: "admin@takecare.com",
                                        first_name: "Admin",
                                        last_name: "TakeCare",
                                        verified: true,
                                        role: "admin",
                                    },
                                },
                            },
                        },
                    },
                },
                401: {
                    description: "Non authentifié.",
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
    "/admin/users": {
        get: {
            summary: "Liste de tous les utilisateurs.",
            description:
                "Récupère la liste de tous les utilisateurs enregistrés dans le système. Réservé aux administrateurs.",
            security: [
                {
                    bearerAuth: [],
                },
            ],
            responses: {
                200: {
                    description:
                        "Liste des utilisateurs récupérée avec succès.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    users: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                user_id: {
                                                    type: "string",
                                                    description:
                                                        "Identifiant unique de l'utilisateur.",
                                                },
                                                email: {
                                                    type: "string",
                                                    description:
                                                        "Email de l'utilisateur.",
                                                },
                                                first_name: {
                                                    type: "string",
                                                    description:
                                                        "Prénom de l'utilisateur.",
                                                },
                                                last_name: {
                                                    type: "string",
                                                    description:
                                                        "Nom de famille de l'utilisateur.",
                                                },
                                                verified: {
                                                    type: "boolean",
                                                    description:
                                                        "Statut de vérification.",
                                                },
                                                role: {
                                                    type: "string",
                                                    description:
                                                        "Rôle de l'utilisateur.",
                                                },
                                                quiz_finished: {
                                                    type: "boolean",
                                                    description:
                                                        "Indique si le quiz est complété.",
                                                },
                                                chat_tokens: {
                                                    type: "number",
                                                    description:
                                                        "Jetons de chat disponibles.",
                                                },
                                            },
                                        },
                                    },
                                },
                                example: {
                                    users: [
                                        {
                                            user_id:
                                                "46ba028c-7809-496b-979f-90c7f5884dbb",
                                            email: "john.doe@gmail.com",
                                            first_name: "John",
                                            last_name: "Doe",
                                            verified: true,
                                            role: "user",
                                            quiz_finished: true,
                                            chat_tokens: 10,
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
                401: {
                    description: "Non authentifié.",
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
    "/admin/user/health/{userId}": {
        get: {
            summary: "Récupération des données de santé d'un utilisateur.",
            description:
                "Permet à un administrateur de consulter les données de santé déchiffrées d'un utilisateur spécifique.",
            security: [
                {
                    bearerAuth: [],
                },
            ],
            parameters: [
                {
                    name: "userId",
                    in: "path",
                    required: true,
                    description:
                        "Identifiant unique de l'utilisateur dont on veut récupérer les données de santé.",
                    schema: {
                        type: "string",
                    },
                },
            ],
            responses: {
                200: {
                    description: "Données de santé récupérées avec succès.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    user_id: {
                                        type: "string",
                                        description:
                                            "Identifiant de l'utilisateur.",
                                    },
                                    gender: {
                                        type: "string",
                                        description: "Genre de l'utilisateur.",
                                    },
                                    birth_date: {
                                        type: "string",
                                        format: "date-time",
                                        description: "Date de naissance.",
                                    },
                                    weight: {
                                        type: "number",
                                        description: "Poids.",
                                    },
                                    weight_unit: {
                                        type: "string",
                                        description: "Unité de poids.",
                                    },
                                    height: {
                                        type: "number",
                                        description: "Taille.",
                                    },
                                    height_unit: {
                                        type: "string",
                                        description: "Unité de taille.",
                                    },
                                    alcohol: {
                                        type: "string",
                                        description: "Consommation d'alcool.",
                                    },
                                    smoking: {
                                        type: "string",
                                        description: "Consommation de tabac.",
                                    },
                                    health_goal: {
                                        type: "array",
                                        items: { type: "string" },
                                        description: "Objectifs de santé.",
                                    },
                                    stress_level: {
                                        type: "number",
                                        description: "Niveau de stress.",
                                    },
                                    created_at: {
                                        type: "string",
                                        format: "date-time",
                                        description:
                                            "Date de création des données.",
                                    },
                                },
                                example: {
                                    user_id:
                                        "46ba028c-7809-496b-979f-90c7f5884dbb",
                                    gender: "male",
                                    weight: 70,
                                    weight_unit: "kg",
                                    height: 175,
                                    height_unit: "cm",
                                    alcohol: "occasionally",
                                    smoking: "never",
                                    health_goal: [
                                        "health_improvement",
                                        "physical_activity",
                                    ],
                                    stress_level: 4,
                                    created_at: "2025-03-24T12:22:13.025Z",
                                },
                            },
                        },
                    },
                },
                401: {
                    description: "Non authentifié.",
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
    "/admin/users/{userId}": {
        put: {
            summary: "Modification d'un utilisateur.",
            description:
                "Permet à un administrateur de modifier les données d'un utilisateur spécifique.",
            security: [
                {
                    bearerAuth: [],
                },
            ],
            parameters: [
                {
                    name: "userId",
                    in: "path",
                    required: true,
                    description:
                        "Identifiant unique de l'utilisateur à modifier.",
                    schema: {
                        type: "string",
                    },
                },
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            description:
                                "Données de l'utilisateur à mettre à jour.",
                            example: {
                                weight: 75,
                                weight_unit: "kg",
                                health_goal: [
                                    "stress_reduction",
                                    "health_improvement",
                                ],
                            },
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "Utilisateur modifié avec succès.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    success: {
                                        type: "boolean",
                                        description:
                                            "Indique si la modification a réussi.",
                                    },
                                },
                                example: {
                                    success: true,
                                },
                            },
                        },
                    },
                },
                400: {
                    description:
                        "Données utilisateur manquantes dans la requête.",
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
                                    message: "Missing user in request",
                                },
                            },
                        },
                    },
                },
                401: {
                    description: "Non authentifié.",
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
