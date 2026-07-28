# Task: Tích hợp @dnd-kit Grid Kéo-Thả & Bulk Upsert cho Chuyến đi trên Dashboard

- [ ] Cập nhật `package.json` cài đặt các thư viện `@dnd-kit` và gỡ bỏ `@hello-pangea/dnd`
- [ ] Refactor `DashboardPage.jsx` để biến danh sách chuyến đi thành Grid Cards và sử dụng `DndContext` + `SortableContext` + `rectSortingStrategy`
- [ ] Viết hàm `onDragEnd` cập nhật thứ tự chuyến đi và gửi 1 request Bulk Upsert đến database
- [ ] Build & Test trên container
