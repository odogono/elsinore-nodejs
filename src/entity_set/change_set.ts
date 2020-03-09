
export enum ChangeSetOp {
    None = 0,
    Add = 1 << 0,
    Update = 1 << 1,
    Remove = 1 << 2
};


export interface ChangeSet<T> {
    added: Set<T>;
    updated: Set<T>;
    removed: Set<T>;
}

export function create<T>():ChangeSet<T> {
    return {
        added: new Set<T>(),
        updated: new Set<T>(),
        removed: new Set<T>(),
    };
}


export function getChanges<T>( set:ChangeSet<T>, ops:ChangeSetOp ): Array<T> {
    let result = new Set<T>();
    if( (ops & ChangeSetOp.Add) === ChangeSetOp.Add ){
        result = new Set([...set.added]);
    }
    if( (ops & ChangeSetOp.Update) === ChangeSetOp.Update ){
        result = new Set([...result, ...set.updated]);
    }
    if( (ops & ChangeSetOp.Remove) === ChangeSetOp.Remove ){
        result = new Set([...result, ...set.removed]);
    }
    return [...result];
}

export function add<T>( set:ChangeSet<T>, val:T ):ChangeSet<T> {
    const added = new Set(set.added).add( val );
    const updated = new Set(set.updated);
    updated.delete( val );
    const removed = new Set(set.removed);
    removed.delete( val );

    return { added, updated, removed};
}

export function update<T>( set:ChangeSet<T>, val:T ): ChangeSet<T> {
    if( set.added.has( val ) ){
        return set;
    }

    const added = new Set(set.added);
    added.delete(val);
    const updated = new Set(set.updated);
    updated.add( val );
    const removed = new Set(set.removed);
    removed.delete( val );

    return { added, updated, removed};
}


export function remove<T>( set:ChangeSet<T>, val:T ): ChangeSet<T> {
    const added = new Set(set.added);
    added.delete(val);
    const updated = new Set(set.updated);
    updated.delete( val );
    const removed = new Set(set.removed);
    removed.add( val );

    return { added, updated, removed};
}