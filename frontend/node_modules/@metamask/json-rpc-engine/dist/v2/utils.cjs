"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonRpcEngineError = exports.isInstance = exports.stringify = exports.isNotification = exports.isRequest = void 0;
const utils_1 = require("@metamask/utils");
const isRequest = (msg) => (0, utils_1.hasProperty)(msg, 'id');
exports.isRequest = isRequest;
const isNotification = (msg) => !(0, exports.isRequest)(msg);
exports.isNotification = isNotification;
/**
 * JSON-stringifies a value.
 *
 * @param value - The value to stringify.
 * @returns The stringified value.
 */
function stringify(value) {
    return JSON.stringify(value, null, 2);
}
exports.stringify = stringify;
/**
 * The implementation of static `isInstance` methods for classes that have them.
 *
 * @param value - The value to check.
 * @param symbol - The symbol property to check for.
 * @returns Whether the value has `{ [symbol]: true }` in its prototype chain.
 */
const isInstance = (value, symbol) => (0, utils_1.isObject)(value) && symbol in value && value[symbol] === true;
exports.isInstance = isInstance;
const JsonRpcEngineErrorSymbol = Symbol.for('json-rpc-engine#JsonRpcEngineError');
class JsonRpcEngineError extends Error {
    constructor(message) {
        super(message);
        this[_a] = true;
        this.name = 'JsonRpcEngineError';
    }
    /**
     * Check if a value is a {@link JsonRpcEngineError} instance.
     * Works across different package versions in the same realm.
     *
     * @param value - The value to check.
     * @returns Whether the value is a {@link JsonRpcEngineError} instance.
     */
    static isInstance(value) {
        return (0, exports.isInstance)(value, JsonRpcEngineErrorSymbol);
    }
}
exports.JsonRpcEngineError = JsonRpcEngineError;
_a = JsonRpcEngineErrorSymbol;
//# sourceMappingURL=utils.cjs.map