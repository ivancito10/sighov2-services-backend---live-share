import { paginationMeta } from './pagination-meta';

describe('Metadatos de paginación compatibles con pacientes', () => {
    it.each([
        [0, 1, 20, 1, false, false],
        [45, 1, 20, 3, true, false],
        [45, 2, 20, 3, true, true],
        [45, 3, 20, 3, false, true],
        [40, 2, 20, 2, false, true],
        [40, 5, 20, 2, false, true],
    ])(
        'total=%s página=%s límite=%s',
        (total, page, limit, lastPage, hasNextPage, hasPrevPage) => {
            expect(
                paginationMeta(
                    total as number,
                    page as number,
                    limit as number,
                ),
            ).toEqual({
                total,
                page,
                lastPage,
                limit,
                hasNextPage,
                hasPrevPage,
            });
        },
    );
});
