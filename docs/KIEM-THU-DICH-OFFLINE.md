# Kiểm tra bộ dịch chạy trong trình duyệt

Ngày ghi nhận: 22–23/10/2026. Đây là đánh giá trước tích hợp, không phải xác nhận tính năng dịch đã hoàn thành.

## Kết luận hiện tại

**Chưa đủ bằng chứng để đưa OPUS-MT thành công cụ dịch chính thức trong Từ Từ.** Có thể tổ chức chạy hoàn toàn trên trình duyệt, không cần người sở hữu app duy trì laptop hoặc vận hành máy chủ dịch. Tuy nhiên, phép thử thực tế đang bị chặn ở bước tải trọng số mô hình; chưa có bản dịch đầu ra để chấm chất lượng hoặc đo tốc độ suy luận.

Lỗi tải trong môi trường này không chứng minh mọi người dùng đều sẽ gặp lỗi, cũng không chứng minh mô hình dịch kém.

## Những gì đã quan sát trực tiếp

| Hạng mục | Kết quả | Phạm vi |
| --- | --- | --- |
| Trang thử riêng cùng origin với app | Mở được, iframe app hiển thị bình thường | Chromium 155 trên Windows |
| Nạp Transformers.js 3.8.1 trong module worker | Khoảng 468 ms ở lượt đầu | Chỉ thời gian import thư viện, không phải tải mô hình |
| Tải cấu hình và tokenizer Anh → Việt | 4 tệp đã lưu cache, tổng 5.165.508 byte | Cache API của Transformers.js |
| Tải trọng số Anh → Việt | Lỗi `TypeError: network error` sau khoảng 97,4 giây tính từ khi thư viện nạp xong | Chưa xác định được nguyên nhân sâu của đường mạng |
| Dùng app khi bộ dịch đang tải | Mở từ điển, nhập `hello`, nhận 3 kết quả | Không có phép thử khi mô hình đang suy luận |
| Dừng và khởi động lại worker | Nút dừng trả giao diện về trạng thái có thể thử lại; worker mới đọc được các tệp nhỏ từ cache | Lượt thử lại bị gián đoạn khi phiên trình duyệt mất kết nối |
| Chất lượng dịch | **Chưa đo được** | 0/24 câu có đầu ra; không được tính là 0% chất lượng |
| Thời gian dịch, RAM khi suy luận | **Chưa đo được** | Không suy ra từ dung lượng tệp |
| Offline sau khi đóng/mở lại app | **Chưa xác minh** | Có cache mô hình không đồng nghĩa toàn bộ app dịch đã dùng offline được |
| Safari/iPhone, Android, Firefox | **Chưa thử** | Thu nhỏ viewport desktop không thay thế thiết bị thật |

Ở lượt tiếp tục, công cụ điều khiển trình duyệt trả `Transport closed`. Thử tải cấu hình trực tiếp bằng Node cũng bị lỗi DNS `ENOTFOUND`. Thử tải tệp lớn trực tiếp qua giao diện không cho ra tệp có thể sử dụng trước khi phiên trình duyệt bị ngắt.

Các quan sát trên được chép từ kết quả hiển thị của lượt chạy; chưa xuất được JSON gốc trước khi phiên kiểm thử bị mất.

## Dung lượng dự kiến và cấu hình thử

- Thư viện: `@huggingface/transformers@3.8.1`.
- Mô hình: `Xenova/opus-mt-en-vi` ở revision `30bcd46`; `Xenova/opus-mt-vi-en` ở revision `541dfd7`.
- Cấu hình: `dtype: q8`, WASM, 1 luồng, `num_beams: 4`, tối đa 256 token đầu ra.
- Bản harness hiện tại thêm tiền tố đích `>>vie<<` cho Anh → Việt theo model card gốc; bản sửa này mới được kiểm tra cú pháp, chưa chạy suy luận.
- Pipeline Anh → Việt thực tế yêu cầu `encoder_model_quantized.onnx` và `decoder_model_merged_quantized.onnx`.
- Danh mục tệp của cả hai mô hình ghi khoảng **47,1 MB encoder + 54,4 MB decoder** cho mỗi chiều: khoảng **101,5 MB trọng số/chiều**, chưa gồm tokenizer, thư viện JavaScript và WASM.
- Vì vậy tải đủ cả hai chiều vượt **200 MB**. Đây là ước lượng từ danh mục tệp, không phải số byte tải thành công trong phép thử.
- Hai mô hình gốc đều ghi giấy phép Apache-2.0. Cần kèm thông báo giấy phép/nguồn khi phân phối lại.

## Kiểm tra app hiện có trong lượt tiếp tục

Lượt chạy mặc định nhiều tiến trình gặp lỗi cấp phát bộ nhớ. Chạy lại tuần tự bằng `node --test --test-concurrency=1 tests/*.test.cjs tests/dom-check.cjs` cho kết quả **36 kiểm tra qua, 2 tiến trình kiểm tra dừng vì thiếu bộ nhớ**, exit code 1. Hai tiến trình dừng là `dictionary.test.cjs` và `dom-check.cjs`; không có kết luận rằng toàn bộ bộ kiểm tra đã qua.

Tại thời điểm đo, hệ điều hành báo tổng RAM khoảng 8.013 MiB, còn trống khoảng 425 MiB; giới hạn heap Node khoảng 2.240 MiB. Các thông báo gồm `Committing semi space failed` và `Allocation failed - JavaScript heap out of memory`. Đây là bằng chứng thiếu tài nguyên trong môi trường kiểm tra, chưa phải phép đo RAM của mô hình dịch và chưa đủ để quy lỗi cho thay đổi app.

Các kiểm tra đóng gói, hash precache, các quan hệ WordNet và service worker hiện có qua ở lượt tuần tự. Không thay đổi `index.html`, service worker, dữ liệu hay giao diện app để bật phần dịch trong lượt này.

## Các điểm phải xử lý nếu tích hợp

1. Chỉ tải bộ dịch khi người dùng chọn dùng; hiển thị dung lượng, tiến độ, hủy, lỗi và thử lại. Không đưa toàn bộ mô hình vào lượt mở app đầu tiên.
2. Chạy suy luận trong worker; có hàng đợi, hủy và bỏ kết quả cũ khi người dùng đổi câu hoặc đổi chiều dịch. Chỉ giữ một mô hình trong RAM ở thời điểm đầu triển khai.
3. Đóng gói hoặc cache có kiểm soát cả JavaScript và WASM. Service worker hiện tại chỉ cache các tài nguyên được cho phép; nó không tự đảm bảo thư viện/WASM từ CDN hoạt động offline ở lần mở app sau.
4. Kiểm tra cache/quota và báo khi cần tải lại. Trình duyệt có thể thu hồi dữ liệu cache khi thiếu dung lượng; không hứa “tải một lần là giữ vĩnh viễn”.
5. Kiểm tra số token trước khi dịch, chia đoạn dài theo câu và giữ cấu trúc dòng. Không âm thầm cắt phần cuối khi vượt giới hạn.
6. Giữ nguyên mã đơn, con số, ngày giờ; không dùng một bản dịch trôi chảy làm bằng chứng rằng nội dung đã đúng.
7. Kiểm tra trên Safari/iPhone và Android thật trước khi bật mặc định. Các kiểm tra này chưa được thực hiện.

## Bộ câu thử và cách chạy lại

Bộ thử nằm trong `tools/translation-bench/`, không được import từ `index.html` của app và không nằm trong precache ban đầu. Có 24 câu tổng hợp, 12 câu mỗi chiều: giao tiếp, phủ định, điều kiện, thành ngữ, từ đa nghĩa, con số/mã đơn, giải thích, đoạn dài, câu lịch sự, kỹ thuật, không dấu và danh sách nhiều dòng.

Khi máy chủ phát triển hiện có đang chạy, mở:

`http://127.0.0.1:8877/tools/translation-bench/`

Chạy từng chiều rồi xuất JSON. Đây chỉ là địa chỉ kiểm thử cục bộ; bản app cuối có thể chạy trên host tĩnh mà không cần bật laptop.

Sau khi có đầu ra, cần đọc từng câu và ghi rõ: giữ đúng ý / hiểu được nhưng gượng / sai hoặc mất ý. Đặc biệt xem phủ định có bị đảo, điều kiện quá khứ có còn, hai nghĩa của “bank” có được phân biệt, mã `AB-204` và số tiền có giữ nguyên. Không tính thành công của request là đạt chất lượng dịch.

Nút “Chặn mạng trong bộ dịch và thử cache” chỉ chặn `fetch` trong worker sau khi thư viện đã nạp. Dù thử này thành công, vẫn phải kiểm tra riêng tình huống đóng app, ngắt mạng thật rồi mở lại; không được coi hai phép thử tương đương.

## Nguồn chính

- [Transformers.js](https://github.com/huggingface/transformers.js)
- [Hướng dẫn dùng Web Worker](https://huggingface.co/docs/transformers.js/v3.0.0/tutorials/next)
- [Cấu hình cache Transformers.js](https://huggingface.co/docs/transformers.js/v3.8.1/api/env)
- [Tệp ONNX Anh → Việt](https://huggingface.co/Xenova/opus-mt-en-vi/tree/main/onnx)
- [Tệp ONNX Việt → Anh](https://huggingface.co/Xenova/opus-mt-vi-en/tree/main/onnx)
- [Mô hình gốc Anh → Việt](https://huggingface.co/Helsinki-NLP/opus-mt-en-vi)
- [Mô hình gốc Việt → Anh](https://huggingface.co/Helsinki-NLP/opus-mt-vi-en)
- [Dung lượng lưu trữ và thu hồi cache trong trình duyệt](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
