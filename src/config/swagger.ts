/* eslint-disable @typescript-eslint/no-explicit-any */
import swaggerJsDoc from "swagger-jsdoc";
import userDocs from "@docs/user-docs";
import authDocs from "@docs/auth-docs";
import chatDocs from "@docs/chat-docs";

// Add tags for different route categories
const tags = [
    { name: "Auth", description: "Authentication endpoints" },
    { name: "Users", description: "User endpoints" },
    { name: "Chat", description: "Chat endpoints" },
];

// Add tag to each path
const addTagsToRoutes = (routes: any, tagName: string) => {
    const taggedRoutes: any = {};

    for (const [path, methods] of Object.entries(routes)) {
        taggedRoutes[path] = {};
        for (const [method, definition] of Object.entries(methods as any)) {
            taggedRoutes[path][method] = {
                ...(definition as any),
                tags: [
                    (definition as any).tags?.length
                        ? (definition as any).tags
                        : tagName,
                ],
            };
        }
    }

    return taggedRoutes;
};

// Configuration Swagger
const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "API Documentation",
            version: "1.0.0",
            description: "Documentation de l'API avec Swagger",
        },
        tags,
        paths: {
            ...addTagsToRoutes(userDocs, "Users"),
            ...addTagsToRoutes(authDocs, "Auth"),
            ...addTagsToRoutes(chatDocs, "Chat"),
        },
        servers: [
            {
                url: "http://localhost:4000",
                description: "Serveur local",
            },
        ],
        security: [{ bearerAuth: [] }],
    },
    apis: ["./src/routes/*.ts"],
};

export const swaggerDocs = swaggerJsDoc(swaggerOptions);
