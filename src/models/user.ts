class User {
    user_id: string;
    constructor(user_id: string) {
        this.user_id = user_id;
    }

    getUserInfo() {
        return this.user_id;
    }
}

exports.default = User;
