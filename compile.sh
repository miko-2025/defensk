emcc defensk.c rote/libtinyspline.a -I./ \
  -s EXPORTED_FUNCTIONS='["_malloc", "_free", "_create_spline", "_spline_at", "_spline_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "HEAPF32", "HEAPF64", "HEAP8"]' \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=0 \
  -s EXPORT_NAME='DEFENSK' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -o defensk.c.js
