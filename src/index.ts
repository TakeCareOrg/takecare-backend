import { app } from "./app";

const port: string | number = process.env.PORT || 3000;

const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

export { server };
