export function paginationMeta(total: number, page: number, limit: number) {
    const lastPage = Math.ceil(total / limit) || 1;
    return {
        total,
        page,
        lastPage,
        limit,
        hasNextPage: page < lastPage,
        hasPrevPage: page > 1,
    };
}
