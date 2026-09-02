"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsArgs = void 0;
exports.corsArgs = {
    origin: (origin, callback) => {
        const whiteList = [
            "http://localhost:3001",
            "http://localhost:3000",
            "",
            "http://127.0.0.1:4001",
        ];
        if (!origin && process.env.SERVER_STATUS == "development") {
            return callback(null, true);
        }
        if (!whiteList.includes(origin)) {
            return callback(new Error("origin not allowed"));
        }
        callback(null, origin);
    },
};
