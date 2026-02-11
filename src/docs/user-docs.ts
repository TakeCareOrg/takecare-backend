export default {
    "/users/me": {
        patch: {
            summary: "Mise à jour des informations de l'utilisateur.",
            description:
                "Permet à l'utilisateur authentifié de mettre à jour ses informations personnelles (prénom, nom, avatar).",
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
                            properties: {
                                first_name: {
                                    type: "string",
                                    minLength: 1,
                                    maxLength: 50,
                                    description:
                                        "Nouveau prénom de l'utilisateur.",
                                },
                                last_name: {
                                    type: "string",
                                    minLength: 1,
                                    maxLength: 50,
                                    description:
                                        "Nouveau nom de famille de l'utilisateur.",
                                },
                                avatar: {
                                    type: "string",
                                    format: "uri",
                                    description:
                                        "Nouvelle URL de l'avatar de l'utilisateur.",
                                },
                            },
                            example: {
                                first_name: "John",
                                last_name: "Smith",
                                avatar: "https://example.com/new-avatar.jpg",
                            },
                        },
                    },
                },
            },
            responses: {
                200: {
                    description:
                        "Informations utilisateur mises à jour avec succès.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    user: {
                                        type: "object",
                                        properties: {
                                            first_name: {
                                                type: "string",
                                                description:
                                                    "Prénom mis à jour.",
                                            },
                                            last_name: {
                                                type: "string",
                                                description:
                                                    "Nom de famille mis à jour.",
                                            },
                                            avatar: {
                                                type: "string",
                                                description:
                                                    "URL de l'avatar mis à jour.",
                                            },
                                        },
                                    },
                                },
                                example: {
                                    user: {
                                        first_name: "John",
                                        last_name: "Smith",
                                        avatar: "https://example.com/new-avatar.jpg",
                                    },
                                },
                            },
                        },
                    },
                },
                400: {
                    description: "Identifiant utilisateur manquant.",
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
                                    message: "MISSING_USER_ID",
                                },
                            },
                        },
                    },
                },
                403: {
                    description: "Accès non autorisé.",
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
        get: {
            summary: "Récupération des informations de l'utilisateur.",
            description:
                "Renvoie les informations de l'utilisateur authentifié basé sur le token JWT.",
            security: [
                {
                    bearerAuth: [],
                },
            ],
            responses: {
                200: {
                    description:
                        "Informations utilisateur récupérées avec succès.",
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
                                                    "Statut de vérification de l'email de l'utilisateur.",
                                            },
                                            role: {
                                                type: "string",
                                                description:
                                                    "Rôle de l'utilisateur dans le système.",
                                            },
                                            quiz_finished: {
                                                type: "boolean",
                                                description:
                                                    "Indique si l'utilisateur a complété le questionnaire de santé.",
                                            },
                                            chat_tokens: {
                                                type: "number",
                                                description:
                                                    "Nombre de jetons de chat disponibles pour l'utilisateur.",
                                            },
                                            chat_tokens_refreshed_at: {
                                                type: "string",
                                                format: "date-time",
                                                description:
                                                    "Date de la dernière actualisation des jetons de chat.",
                                            },
                                            avatar: {
                                                type: "string",
                                                description:
                                                    "URL de l'avatar de l'utilisateur.",
                                            },
                                            health: {
                                                type: "object",
                                                description:
                                                    "Informations de santé de l'utilisateur.",
                                            },
                                        },
                                    },
                                },
                                example: {
                                    user: {
                                        user_id:
                                            "46ba028c-7809-496b-979f-90c7f5884dbb",
                                        email: "john.doe@gmail.com",
                                        first_name: "John",
                                        last_name: "Doe",
                                        verified: true,
                                        role: "user",
                                        quiz_finished: true,
                                        chat_tokens: 10,
                                        chat_tokens_refreshed_at:
                                            "2025-03-24T12:22:13.025Z",
                                        avatar: "https://example.com/avatar.jpg",
                                        health: {
                                            age: 30,
                                            height: 175,
                                            weight: 70,
                                            gender: "male",
                                            activity_level: "moderately_active",
                                            goals: "maintain_weight",
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                403: {
                    description: "Accès non autorisé.",
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
    "/users/health-quiz": {
        post: {
            summary: "Soumission du questionnaire de santé.",
            description:
                "Permet à l'utilisateur de soumettre ses informations de santé via le questionnaire.",
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
                            required: [
                                "first_name",
                                "last_name",
                                "age",
                                "height",
                                "weight",
                                "gender",
                                "activity_level",
                                "goals",
                            ],
                            properties: {
                                first_name: {
                                    type: "string",
                                    description: "Prénom de l'utilisateur.",
                                },
                                last_name: {
                                    type: "string",
                                    description:
                                        "Nom de famille de l'utilisateur.",
                                },
                                age: {
                                    type: "integer",
                                    description:
                                        "Âge de l'utilisateur en années.",
                                },
                                height: {
                                    type: "number",
                                    description:
                                        "Taille de l'utilisateur en cm.",
                                },
                                weight: {
                                    type: "number",
                                    description:
                                        "Poids de l'utilisateur en kg.",
                                },
                                gender: {
                                    type: "string",
                                    description: "Genre de l'utilisateur.",
                                },
                                activity_level: {
                                    type: "string",
                                    enum: [
                                        "sedentary",
                                        "lightly_active",
                                        "moderately_active",
                                        "very_active",
                                        "extra_active",
                                    ],
                                    description:
                                        "Niveau d'activité physique de l'utilisateur.",
                                },
                                goals: {
                                    type: "string",
                                    enum: [
                                        "lose_weight",
                                        "maintain_weight",
                                        "gain_weight",
                                        "improve_fitness",
                                        "reduce_stress",
                                    ],
                                    description:
                                        "Objectifs de santé de l'utilisateur.",
                                },
                            },
                            example: {
                                first_name: "John",
                                last_name: "Doe",
                                age: 30,
                                height: 175,
                                weight: 70,
                                gender: "male",
                                activity_level: "moderately_active",
                                goals: "maintain_weight",
                            },
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "Questionnaire de santé complété avec succès.",
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
                                    message: "Health quiz completed",
                                },
                            },
                        },
                    },
                },
                400: {
                    description: "Données de santé manquantes.",
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
                                    message: "MISSING_HEALTH_DATA",
                                },
                            },
                        },
                    },
                },
                403: {
                    description: "Accès non autorisé.",
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
    "/users/health-data": {
        patch: {
            summary: "Mise à jour des données de santé.",
            description:
                "Permet à l'utilisateur authentifié de mettre à jour ses données de santé. Seuls les champs fournis seront modifiés.",
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
                            properties: {
                                weight: {
                                    type: "number",
                                    nullable: true,
                                    description: "Poids de l'utilisateur.",
                                },
                                weight_unit: {
                                    type: "string",
                                    enum: ["kg", "lbs"],
                                    nullable: true,
                                    description: "Unité de mesure du poids.",
                                },
                                height: {
                                    type: "number",
                                    nullable: true,
                                    description: "Taille de l'utilisateur.",
                                },
                                height_unit: {
                                    type: "string",
                                    enum: ["cm", "ft"],
                                    nullable: true,
                                    description:
                                        "Unité de mesure de la taille.",
                                },
                                birth_date: {
                                    type: "string",
                                    format: "date-time",
                                    nullable: true,
                                    description:
                                        "Date de naissance de l'utilisateur.",
                                },
                                gender: {
                                    type: "string",
                                    enum: ["male", "female", "other"],
                                    nullable: true,
                                    description: "Genre de l'utilisateur.",
                                },
                                alcohol: {
                                    type: "string",
                                    enum: [
                                        "never",
                                        "occasionally",
                                        "cautiously",
                                        "sometimes",
                                        "often",
                                    ],
                                    nullable: true,
                                    description:
                                        "Niveau de consommation d'alcool.",
                                },
                                smoking: {
                                    type: "string",
                                    enum: [
                                        "never",
                                        "occasionally",
                                        "cautiously",
                                        "sometimes",
                                        "often",
                                    ],
                                    nullable: true,
                                    description:
                                        "Niveau de consommation de tabac.",
                                },
                                health_goal: {
                                    type: "array",
                                    nullable: true,
                                    items: {
                                        type: "string",
                                        enum: [
                                            "stress_reduction",
                                            "feel_better",
                                            "health_improvement",
                                            "physical_activity",
                                            "sleep_quality",
                                            "health_advices",
                                        ],
                                    },
                                    description:
                                        "Objectifs de santé de l'utilisateur.",
                                },
                                professional_help: {
                                    type: "array",
                                    nullable: true,
                                    items: { type: "string" },
                                    description:
                                        "Types d'aide professionnelle consultée.",
                                },
                                medication_treatment: {
                                    type: "array",
                                    nullable: true,
                                    items: { type: "string" },
                                    description:
                                        "Traitements médicamenteux en cours.",
                                },
                                medical_treatments: {
                                    type: "array",
                                    nullable: true,
                                    items: { type: "string" },
                                    description:
                                        "Traitements médicaux en cours.",
                                },
                                surgery_before: {
                                    type: "array",
                                    nullable: true,
                                    items: { type: "string" },
                                    description:
                                        "Interventions chirurgicales passées.",
                                },
                                chronic_illness: {
                                    type: "array",
                                    nullable: true,
                                    items: { type: "string" },
                                    description:
                                        "Maladies chroniques de l'utilisateur.",
                                },
                                allergies: {
                                    type: "array",
                                    nullable: true,
                                    items: { type: "string" },
                                    description: "Allergies de l'utilisateur.",
                                },
                                practice_sports: {
                                    type: "array",
                                    nullable: true,
                                    items: { type: "string" },
                                    description:
                                        "Sports pratiqués par l'utilisateur.",
                                },
                                stress_level: {
                                    type: "number",
                                    nullable: true,
                                    description:
                                        "Niveau de stress de l'utilisateur.",
                                },
                                summary_message: {
                                    type: "string",
                                    nullable: true,
                                    description:
                                        "Message résumé de l'utilisateur sur sa santé.",
                                },
                            },
                            example: {
                                weight: 72,
                                weight_unit: "kg",
                                stress_level: 5,
                                health_goal: [
                                    "stress_reduction",
                                    "sleep_quality",
                                ],
                            },
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: "Données de santé mises à jour avec succès.",
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    user: {
                                        type: "object",
                                        description:
                                            "Données de santé mises à jour.",
                                    },
                                },
                                example: {
                                    user: {
                                        weight: 72,
                                        weight_unit: "kg",
                                        stress_level: 5,
                                        health_goal: [
                                            "stress_reduction",
                                            "sleep_quality",
                                        ],
                                    },
                                },
                            },
                        },
                    },
                },
                400: {
                    description: "Données de santé manquantes.",
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
                                    message: "MISSING_HEALTH_DATA",
                                },
                            },
                        },
                    },
                },
                403: {
                    description: "Accès non autorisé.",
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
