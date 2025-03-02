import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { generateToken } from "@utils/jwt";
import { users, User } from "@dtypes/user";
import Logger from "@libs/logger";

// Check if username or email is already in use
const isUniqueUser = (email: string) => {
    return !users.some((user) => user.email === email);
};

export const register: RequestHandler = async (req, res) => {
    const { first_name, last_name, email, password } = req.body;

    // Validate input
    if (!email || !password || !first_name || !last_name) {
        res.status(400).json({ message: "Missing required fields" });
        return;
    }

    // Check if username or email is already taken
    if (!isUniqueUser(email)) {
        res.status(400).json({ message: "Username or email already in use" });
        return;
    }

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser: User = {
            user_id: Date.now().toString(),
            first_name,
            last_name,
            email,
            password: hashedPassword,
            createdAt: new Date(),
        };

        // Save the new user to the array
        users.push(newUser);

        // Make sure to just call res.status().json() without returning it
        res.status(200).json({ message: "User registered successfully" });
    } catch (error) {
        Logger.error(`500: ${error}`);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const login: RequestHandler = async (req, res) => {
    const { email, password } = req.body;
    const user = users.find((u) => u.email === email);

    if (!user) {
        Logger.error(`400: Invalid credentials`);
        res.status(400).json({ message: "Invalid credentials" });
        return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        Logger.error(`400: Invalid credentials`);
        res.status(400).json({ message: "Invalid credentials" });
        return;
    }

    try {
        const token = generateToken({
            user_id: user.user_id,
            email: user.email,
        });
        res.json({ token });
    } catch (error) {
        Logger.error(`500: ${error}`);
        res.status(500).json({ message: "Internal server error" });
    }
};
