// GO is a client batch separator, not T-SQL. Never discover migrations by glob:
// this repository also contains destructive historical demo/reset scripts.
function splitSqlBatches(source) {
  return source.replace(/^\uFEFF/, '').split(/^\s*GO\s*(?:--[^\r\n]*)?$/gim).map(s => s.trim()).filter(Boolean);
}
module.exports = { splitSqlBatches };
