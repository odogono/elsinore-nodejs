import { isObject, isString, isPromise } from "../util/is";
import { stringify } from "../util/json";
import { createLog } from "../util/log";

export enum SType {
    Value = '%v',
    Array = '%[]',
    Map = '%{}',
    Function = '%()',
    Bitfield = '%bf',
    Entity = '%e',
    EntitySet = '%es',
    Component = '%c',
    ComponentDef = '%d',
    ComponentAttr = '%ca',
    ComponentValue = '%cv',
    Any = '%*'
};

const Log = createLog('QueryStack');

export interface InstDefMeta {
    op: string | string[];
}


/**
 * http://wiki.laptop.org/go/Forth_Lesson_1
 */


export type InstResult<QS extends QueryStack> = [
    QS, StackValue?, boolean?
];
export type AsyncInstResult<QS extends QueryStack> = Promise<InstResult<QS>>;

export type StackOp = string;
export type StackValue = [StackOp] | [StackOp, any];

export const Type = '@qs';

export interface QueryStackDefs {
    [def: string]: StackValue;
}

export interface QueryStack {
    items: StackValue[];
    words: any;
}

export function create<QS extends QueryStack>(): QS {
    return {
        items: [],
        words: {}
    } as QS;
}


export class StackError extends Error {
    constructor(...args) {
        super(...args)
        Object.setPrototypeOf(this, StackError.prototype);
        // Log.debug('StackError!', args, this);
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, StackError)
        }
        this.name = 'StackError';
    }
}


export function isStackValue(value: any): boolean {
    return Array.isArray(value) && value.length == 2;
}

/**
 * Pushes a stack value onto the stack
 */
export async function push<QS extends QueryStack>(stack: QS, input: any | StackValue): Promise<[QS, StackValue]> {
    // Log.debug('[push]',value );
    
    let value:StackValue = isStackValue(input) ? input : [SType.Value, input];
    
    let doPush = true;
    
    const handler = getWord(stack, value);
    // Log.debug('[push]','word', input, handler );
    if (handler !== undefined) {
        try {
            let result = handler(stack, input);

            if (isPromise(result)) {
                [stack, value, doPush] = await result;
            } else {
                [stack, value, doPush] = result;
            }
            // Log.debug('[push]', value); 
        } catch (err) {
            // Log.warn('[push]', err.stack);
            throw new Error(`${err.message}: ${stringify(value)}`);
        }
    }
    
    // Log.debug('[push][execute]', value );

    if (value !== undefined && doPush !== false) {
        stack = { ...stack, items: [...stack.items, value] };
    }

    return [stack, value];
}

export function pushRaw<QS extends QueryStack>(stack: QS, value: StackValue): QS {
    return { ...stack, items: [...stack.items, value] };
}


export async function pushValues<QS extends QueryStack>(stack: QS, values: StackValue[]): Promise<[QS, StackValue[]]> {
    let ovalues: StackValue[];

    let start: [QS, StackValue[]] = [stack, []];

    try {
        [stack, ovalues] = await values.reduce<Promise<[QS, StackValue[]]>>(async (prev, value) => {
            let out: StackValue[];
            [stack, out] = await prev;

            return push(stack, value).then(([stack, value]) => {
                return [stack, [...out, value]];
            })
        }, Promise.resolve(start));

    } catch (err) {
        Log.warn('[pushValues]', err.message );
        // if( err instanceof StackError ){
        //     return [stack, []];
        // }
        // Log.debug('not a stackerror?', err instanceof StackError, err.name)
        throw err;
    }
    // for(let ii=0;ii<values.length;ii++ ){
    //     value = values[ii];
    //     [stack,value] = push( stack, value );
    // }
    return [stack, ovalues];
}


/**
 * Prepends a value to the stack
 * 
 * @param stack 
 * @param value 
 */
export function unshift(stack: QueryStack, value: StackValue): QueryStack {
    return {
        ...stack,
        items: [value, ...stack.items]
    }
}

/**
 * Removes and returns a value from
 * @param stack 
 */
export function shift(stack: QueryStack): [QueryStack, StackValue] {
    let items = [...stack.items];
    let value = items.shift();
    return [{ ...stack, items }, value];
}

export function unshiftV(stack: QueryStack, value: any, valueType = SType.Value): QueryStack {
    let itemValue: StackValue = [valueType, value];
    if (isObject(value) && value.type) {
        itemValue = [value.type, value];
    }
    return unshift(stack, itemValue);
}

/**
 * Pushes an arbirtrary value onto the stack
 */
// export function pushV( stack:QueryStack, value:any, valueType = AnyValue ):QueryStack {
//     let itemValue:StackValue = [ valueType, value ];
//     if( isObject(value) && value.type ){
//         itemValue = [value.type, value];
//     }
//     return push( stack, itemValue );
// }

export function pop<QS extends QueryStack>(stack: QS): [QS, StackValue] {
    const length = stack.items.length;
    if (length === 0) {
        throw new Error('stack empty');
        // return undefined;
    }
    const value = stack.items[length - 1];
    stack = {
        ...stack,
        items: stack.items.slice(0, -1)
    }
    return [stack, value];
}



/**
 * Pops values from the stack while the type matches
 * 
 * @param stack 
 * @param type 
 */
export function popOfType<QS extends QueryStack>(stack: QS, ...types: SType[]): [QS, StackValue[]] {
    const length = stack.items.length;
    if (length === 0) {
        return [stack, []];
    }

    let results = [];
    let ii = length - 1;

    for (ii; ii >= 0; ii--) {
        const value = stack.items[ii];
        if (types.indexOf(value[0] as SType) === -1) {
            break;
        }
        results.push(value);
    }

    // cut the stack down to size
    stack = {
        ...stack,
        items: stack.items.slice(0, ii + 1)
    };

    return [stack, results];
}

export function popOfTypeV(stack: QueryStack, ...types: SType[]): [QueryStack, any[]] {

    let results = [];
    [stack, results] = popOfType(stack, ...types);
    return [stack, results.map(r => r[1])];
}

export function peek(stack: QueryStack, offset: number = 0): StackValue {
    return stack.items[stack.items.length - 1 - offset];
}

export function peekV(stack: QueryStack): any {
    const value = stack.items[stack.items.length - 1];
    if (value !== undefined) {
        return value[1];
    }
    return undefined;
}



/**
 * Replaces an item in the stack at the given index
 * 
 * @param stack 
 * @param index 
 * @param newItem 
 */
export function replace(stack: QueryStack, index: number, newItem: StackValue): QueryStack {
    const items = stack.items.map((item, ii) => {
        if (ii !== index) {
            return item;
        }
        return newItem;
    });
    return { ...stack, items };
}

/**
 * 
 */
export function findWithIndex<QS extends QueryStack>(stack: QS, type: StackOp): [number, StackValue] {
    for (let ii = stack.items.length - 1; ii >= 0; ii--) {
        const item = stack.items[ii];
        if (type === item[0]) {
            // Log.debug('[findWithIndex]', 'found', item, ii );
            return [ii, item];
        }
    }
    return [-1, undefined];
}

export function findWithIndexV(stack: QueryStack, type: StackOp): [number, any] {
    let [index, [_, value]] = findWithIndex(stack, type);
    if (index === -1) {
        throw new Error(`type ${type} missing on stack`);
    }
    return [index, value];
}

/**
 * Returns the first value of type from the stack
 * 
 * @param stack 
 * @param type 
 */
export function findV(stack: QueryStack, type: StackOp): any {
    const [_, value] = findWithIndex(stack, type);
    return value ? value[1] : undefined;
}
export function find<QS extends QueryStack>(stack: QS, type: StackOp): StackValue {
    const [_, value] = findWithIndex(stack, type);
    return value;
}


export interface ExecuteOptions {
    pushResult?: boolean;
}


// interface WordMap {
//     [word: string]: [WordFn, SType[]]
// };

type WordFn<QS extends QueryStack> = (stack: QS, val: StackValue) => InstResult<QS>;
type AsyncWordFn<QS extends QueryStack> = (stack: QS, val: StackValue) => Promise<InstResult<QS>>;
type WordSpec<QS extends QueryStack> = [string, WordFn<QS> | AsyncWordFn<QS>, ...SType[]];



export function addWords<QS extends QueryStack>(stack: QS, words: WordSpec<QS>[]):QS {
    return words.reduce((stack, spec) => {
        const [word, fn, ...args] = spec;
        // Log.debug('[addWords]', word, [fn,args]);
        let patterns = stack.words[word] || [];
        patterns = [...patterns, [fn, args]];
        return { ...stack, words: { ...stack.words, [word]: patterns } };
    }, stack);
}


function getWord<QS extends QueryStack>(stack: QS, value: StackValue): WordFn<QS> | undefined {
    // const [type,word] = value;
    // Log.debug('[getWord]', value);
    if (value[0] !== SType.Value) {
        return undefined;
    }
    const wval = value[1];
    const patterns = stack.words[wval];
    if (patterns === undefined) {
        return undefined;
    }
    // Log.debug('[getWord]', 'match', `'${wval}'`, patterns);
    let pattern = patterns.find(pat => {
        const [, args] = pat;
        // Log.debug('[getWord]', 'match', `'${wval}'`, args, stack.items );
        if (matchStack(stack.items, args)) {
            return pat;
        }
    });
    return pattern !== undefined ? pattern[0] : undefined;
}

function matchStack(stackItems: StackValue[], pattern: SType[]) {
    const pLength = pattern.length;
    if (pLength === 0) {
        return true;
    }
    const sLength = stackItems.length;
    if (pLength > sLength) {
        return false;
    }
    for (let ii = 0; ii < pLength; ii++) {
        const sym = pattern[pLength - 1 - ii];
        const [vt] = stackItems[sLength - 1 - ii];
        if (sym !== SType.Any && sym !== vt) {
            return false;
        }
    }
    // Log.debug('[matchStack]', pattern, stackItems );
    return true;
}


export function assertStackSize(stack: QueryStack, expected: number, msg?: string) {
    const len = stack.items.length;
    if (len < expected) {
        if (msg === undefined) {
            msg = `expected stack size ${expected}, actual: ${len}`;
        }
        throw new Error(msg);
    }
}

export function assertStackValueType(stack: QueryStack, index: number, opType: string, argType?: any) {
    // Log.debug('[assertStackValueType]', 'argType', argType );
    const len = stack.items.length;
    const idx = len - 1 - index;
    if (idx < 0) {
        throw new Error(`value out of bounds: -${index + 1} : ${len}`);
    }
    const value: StackValue = stack.items[idx];
    if (value[0] !== opType) {
        throw new Error(`expected value of type ${opType} at index ${idx} : got ${value[0]}`);
    }
    if (argType !== undefined && typeof value[1] !== argType) {
        throw new Error(`expected arg of type ${argType} at index ${idx} : got ${typeof value[1]}`);
    }
}
