#!/bin/bash
# Script chạy unit test cho Trip Schedule Manager

echo "🚀 Khởi động bộ test Trip Schedule (Môi trường: Unit Test)"

# Set biến môi trường để đảm bảo timezone mặc định không ảnh hưởng test
export TZ="UTC" 
export NODE_ENV="test"

# Chạy Vitest ở chế độ run (không watch) và xuất báo cáo coverage
npx vitest run --coverage

if [ $? -eq 0 ]; then
  echo "✅ Tất cả bài test đều pass!"
else
  echo "❌ Có lỗi xảy ra trong quá trình test. Vui lòng kiểm tra lại log."
  exit 1
fi