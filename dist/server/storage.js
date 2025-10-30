import { randomUUID } from "crypto";
export class MemStorage {
    users;
    constructor() {
        this.users = new Map();
    }
    async getUser(id) {
        return this.users.get(id);
    }
    async getUserByUsername(username) {
        return Array.from(this.users.values()).find((user) => user.username === username);
    }
    async createUser(insertUser) {
        const id = randomUUID();
        // 显式构造 User 对象，避免类型推断问题
        const user = {
            id,
            username: insertUser.username,
            password: insertUser.password
        };
        this.users.set(id, user);
        return user;
    }
}
export const storage = new MemStorage();
//# sourceMappingURL=storage.js.map