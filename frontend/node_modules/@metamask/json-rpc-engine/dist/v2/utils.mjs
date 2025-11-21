var _a;
import { hasProperty, isObject } from "@metamask/utils";
export const isRequest = (msg) => hasProperty(msg, 'id');
export const isNotification = (msg) => !isRequest(msg);
/**
 * JSON-stringifies a value.
 *
 * @param value - The value to stringify.
 * @returns The stringified value.
 */
export function stringify(value) {
    return JSON.stringify(value, null, 2);
}
/**
 * The implementation of static `isInstance` methods for classes that have them.
 *
 * @param value - The value to check.
 * @param symbol - The symbol property to check for.
 * @returns Whether the value has `{ [symbol]: true }` in its prototype chain.
 */
export const isInstance = (value, symbol) => isObject(value) && symbol in value && value[symbol] === true;
const JsonRpcEngineErrorSymbol = Symbol.for('json-rpc-engine#JsonRpcEngineError');
export class JsonRpcEngineError extends Error {
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
        return isInstance(value, JsonRpcEngineErrorSymbol);
    }
}
_a = JsonRpcEngineErrorSymbol;
//# sourceMappingURL=utils.mjs.map