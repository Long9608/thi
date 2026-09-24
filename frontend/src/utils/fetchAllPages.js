// Honor the server's effective page size (some endpoints cap it at 100).
// Publish a complete result only; a failed later page must not look like success.
export async function fetchAllPages(fetchPage, pageSize = 100) {
  const rows = [];
  let page = 1;
  for (;;) {
    const response = await fetchPage(page, pageSize);
    if (response?.success === false || !Array.isArray(response?.data)) throw new Error('Không tải được đầy đủ danh sách');
    rows.push(...response.data);
    const pagination = response.pagination;
    if (!pagination || page >= Number(pagination.totalPages ?? Math.ceil(pagination.total / pagination.limit))) {
      return { ...response, data: rows, pagination: { total: rows.length, page: 1, totalPages: 1 } };
    }
    if (!response.data.length) throw new Error('Danh sách đã thay đổi trong khi tải. Vui lòng tải lại.');
    page += 1;
  }
}
