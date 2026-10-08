# Stillroom — Photobooth tiếng Việt

Giao diện chụp ảnh trực tiếp, lấy cảm hứng từ ảnh tham chiếu người dùng cung cấp: nền xanh dương nhạt, camera bên trái, dải ảnh bên phải, bộ lọc phía dưới.

## Chạy tại máy

Yêu cầu Node.js 22.16 trở lên (dùng SQLite tích hợp trong Node).

~~~sh
npm ci
npm run dev
~~~

Mở http://127.0.0.1:3000. Nhấn **Bật camera** để cấp quyền, hoặc dùng **Ảnh mẫu** / **Tải ảnh lên**.

## Tính năng

- Tiếng Việt là ngôn ngữ chính, bao gồm thông báo lỗi, hướng dẫn và metadata.
- 4 bố cục: dải 1×4, lưới 2×2, chân dung và Polaroid.
- Chụp từng ảnh hoặc tự động; đếm ngược 1, 3, 5 hoặc 10 giây; dừng chụp khi cần.
- Tải ảnh JPG, PNG, WebP từ thiết bị, tối đa 20 MB mỗi ảnh; thay từng ô ảnh.
- 12 bộ lọc: tự nhiên, đen trắng, nắng ấm, trong veo, phim cũ, sắc nét, mềm mại, nâu hoài niệm, hồng mơ, cam đào, bạc hà, tím sương.
- Khung **Mèo và sao xanh** dùng ảnh JPG do người dùng cung cấp, giữ nguyên trang trí, ghép 3 ảnh theo góc của các ô Polaroid. Xuất PNG 736 × 1308 theo kích thước gốc.
- 30 khung: 26 mẫu vector Stillroom (gồm 6 mẫu xanh mới), 1 khung do người dùng cung cấp và 3 khung ảnh sưu tầm từ bộ tải miễn phí của Cristian / DetaNet. Khung sưu tầm có bố cục 3 ảnh riêng, xuất 1800 × 1200. Nguồn được ghi trong thư viện và public/frames/SOURCES.md.
- 5 hiệu ứng có thể kết hợp: TimeStamp, Light Leak, Vignette, Grain, Chromatic. Áp dụng sau khi chụp hoặc tải ảnh, vào cả ảnh xem trước và PNG. Hạt phim dùng seed cố định; dấu thời gian giữ nguyên trong một phiên chụp.
- Làm đẹp bằng thuật toán làm mịn thích ứng theo độ biến thiên cục bộ và tăng sáng gamma nhẹ, không dùng mô hình AI. Hai thanh mức độ từ 0–100; tắt trả về ảnh gốc. Xử lý sau chụp và khi xuất ảnh, không chạy trong vòng lặp camera.
- 100 sticker OpenMoji lưu cục bộ, 5 nhóm, tìm kiếm tiếng Việt không dấu; tối đa 20 sticker trên một ảnh. Kéo bằng chuột/cảm ứng, di chuyển bằng phím mũi tên để chỉnh vị trí. Kéo nút ↻ trên sticker để xoay, nút ↘ để đổi kích thước; không cần nhập tọa độ/góc quay. Các tay nắm hỗ trợ cả chuột, cảm ứng và phím mũi tên. Xuất PNG giữ các sticker. Nguồn: https://openmoji.org/ ; giấy phép CC BY-SA 4.0, chi tiết public/stickers/SOURCES.md. Đây là nguồn miễn phí thay thế đã được người dùng đồng ý, không phải 100 ảnh tải từ Pinterest.
- 6 liên kết Pinterest để khám phá thêm, phân biệt rõ với khung đã cài trong thư viện.
- Chỉnh khung, màu nền, màu viền, lời nhắn, ngày chụp và trang trí; xuất PNG độ phân giải cao.
- Ảnh chụp và ảnh ghép của khách được xử lý tại trình duyệt. Riêng ảnh nền khung do admin tải lên được lưu trên máy chủ để dùng chung. Khách không cần tài khoản hoặc API key.
- Quản trị có đăng nhập: tải ảnh nền PNG/JPG/WebP, tạo 1–4 ô ảnh, kéo từng góc hoặc nhập tọa độ, xem thử, lưu nháp, công bố, chỉnh sửa và xóa. Khung công bố xuất hiện trong mục **Khung admin** của booth.
- Thư viện tải từng khung độc lập. Một ảnh lỗi không khóa các khung còn lại; bấm lại khung lỗi để thử tải lại.

## Tối ưu UI/UX

Mở trực tiếp vào booth. Không tải phần trang giới thiệu, GSAP, marquee, hiệu ứng ghim hoặc hiệu ứng cuộn vào trang hiện hành. Chỉ giữ đếm ngược và phản hồi chụp ngắn. Preview dùng hai canvas tái sử dụng ở khoảng 12 fps; ảnh mẫu chỉ được vẽ lại khi thay đổi bộ lọc hoặc bố cục, trừ khi bật AR. Tạm ngưng preview khi tab bị ẩn. Bộ lọc preview và xuất ảnh dùng cùng phép biến đổi pixel, kể cả trên trình duyệt không hỗ trợ canvas.filter.

## Kiến trúc

- src/components/frame-admin.tsx: đăng nhập và trình tạo khung.
- src/app/api/: xác thực admin, quản lý khung và phục vụ ảnh PNG.
- src/lib/server-store.ts: SQLite, băm mật khẩu scrypt, phiên đăng nhập và giới hạn thử mật khẩu.
- src/lib/shared-frames.ts: định nghĩa khung dùng chung và bộ nhớ ảnh phía khách.
- src/components/booth.tsx: giao diện, chụp tự động/thủ công, tải ảnh, modal khung và chỉnh ảnh.
- src/hooks/use-camera.ts: vòng đời camera, xử lý lỗi, vô hiệu hóa yêu cầu cũ, dừng track.
- src/lib/config.ts: 4 bố cục thường và 2 bố cục khung ảnh nhập, 12 bộ lọc, 30 khung.
- src/lib/frames.ts: vẽ họa tiết khung vector vào cả ảnh xem trước và PNG.
- src/lib/imaging.ts: chụp, crop, bộ lọc, hiệu ứng vùng, ghép ảnh, tải PNG.
- src/lib/coordinates.ts: quy đổi tọa độ cho tính năng hand tracking sau này. AR khuôn mặt dùng MediaPipe riêng.
- public/sample.jpg: ảnh minh họa tạo bằng ImageGen, không phải ảnh người dùng.
- public/fonts: font Satoshi được lưu cục bộ.

Camera trước được lật trong preview; ảnh xuất giữ chiều gốc. Camera tắt khi hoàn tất bộ ảnh, chuyển sang ảnh mẫu hoặc rời trang. Sau khi chụp bộ mới, nhấn Bật camera để mở lại. Các ảnh chưa tải sẽ mất khi làm mới trang.

## Kiểm tra và build

~~~sh
npm run typecheck
npm run build
npm run dev
npm test
~~~

Bộ kiểm thử Playwright chạy trên Edge, dùng MediaStream tổng hợp từ canvas để kiểm tra vòng đời camera mà không truy cập webcam cá nhân. Bao gồm giao diện tiếng Việt, 30 khung, 12 bộ lọc, chụp tự động/thủ công, PNG đúng kích thước và màu khung, tải ảnh, hủy đếm ngược, lỗi camera và các kích thước màn hình.

Ảnh chụp giao diện nằm trong screenshots/. Kiểm tra thực tế webcam, quyền truy cập và iOS Safari vẫn cần thực hiện trên thiết bị đích.

## Quản trị khung

Khi chạy `npm run dev` tại máy, mở http://127.0.0.1:3000/admin/ và tạo tài khoản đầu tiên với email, mật khẩu ít nhất 12 ký tự. Không có mật khẩu mặc định. Sau đó chỉ tài khoản này đăng nhập được.

1. Tải ảnh nền khung, đặt tên và thêm từ 1 đến 4 ô ảnh.
2. Kéo bốn góc mỗi ô khớp vùng ảnh; có thể nhập X/Y theo phần trăm. Góc lần lượt là trên trái, trên phải, dưới phải, dưới trái; không để các cạnh tự cắt nhau.
3. Bảng **Các lớp** hiển thị ảnh nền, từng ô ảnh và sticker theo thứ tự trên xuống. Chọn lớp, dùng ↑/↓ để đổi thứ tự, ◉/○ để ẩn/hiện, khóa để tránh sửa nhầm, hoặc chỉnh độ hiện. Có thể thêm sticker trực tiếp vào khung. Lớp và sticker được lưu cùng khung, áp dụng cho ảnh thử và PNG của khách; khung cũ tự dùng thứ tự tương thích.
4. Với JPG có vùng trắng và trang trí chồng lên ảnh: chọn **Khoét ô ảnh từ vùng trắng**, bấm giữa từng ô theo thứ tự chụp. Mỗi lần bấm tạo vùng trong suốt và một ô ảnh bên dưới; lớp khung tự nằm trên các ảnh. Bắt đầu với khung chưa có ô ảnh, tối đa 4 ô. Dùng **Hoàn tác lần khoét** và chỉnh độ nhạy nếu mép chọn chưa đúng; độ nhạy thấp giữ chi tiết trắng tốt hơn. Công cụ chỉ khoét vùng trắng nối liền tại điểm bấm, không tự xóa mọi màu trắng. Vùng nối ra ngoài hoặc quá lớn sẽ bị từ chối. Với PNG đã trong suốt, có thể thêm ô thủ công rồi bật đặt khung lên trên ảnh.
5. Xem thử, rồi **Lưu bản nháp** hoặc **Lưu và công bố**. Lưu bản nháp một khung đã công bố sẽ ẩn khung khỏi thư viện khách.
6. Về booth, chọn **Chọn khung → Khung admin**. Thư viện cập nhật khi mở trang hoặc quay lại tab. Ảnh xuất dùng đúng kích thước khung và vị trí các ô.

Ảnh tải lên được chuẩn hóa thành PNG, cạnh dài tối đa 2400 px trong trình tạo. Máy chủ kiểm tra kiểu ảnh, kích thước và các ô ảnh; không nhận URL ảnh bên ngoài. Mật khẩu lưu dưới dạng scrypt có salt; phiên 24 giờ dùng cookie HttpOnly, SameSite=Strict và Secure khi chạy production. Thao tác thay đổi yêu cầu đúng Origin. Khung nháp và API quản trị yêu cầu đăng nhập; sau 5 lần sai, tài khoản bị giới hạn đăng nhập 15 phút.

Dữ liệu nằm trong `.data/photobooth.sqlite` (cả ảnh nền khung), không phải localStorage. Đặt `PHOTOBOOTH_DATA_DIR` để chọn thư mục khác. Mọi người truy cập cùng máy chủ sẽ thấy cùng thư viện. Khi sao lưu bằng cách chép tệp, dừng máy chủ trước và sao lưu cả thư mục dữ liệu; giữ thư mục này qua mỗi lần cập nhật website.

## Kiểm thử quản trị

Sau `npm run build`, chạy `npm run test:admin`. Bộ kiểm thử tự mở máy chủ production ở cổng 3001, dùng thư mục `.data-test-admin-*` riêng và tài khoản ngẫu nhiên cho lần chạy. Không thiết lập hay thay đổi tài khoản thật. Kiểm tra phân quyền, chống yêu cầu khác Origin, PNG xuất đúng vùng ảnh, lưu nháp, công bố, sửa, ẩn, xóa, đăng xuất và giới hạn thử mật khẩu. `npm test` chạy các kiểm tra booth với máy chủ dev ở cổng 3000.

## Triển khai

Website hiện cần máy chủ Node có ổ đĩa bền vững; không dùng bản static `out/` nữa. Chạy `npm run build`, rồi `npm start`. Các lệnh mặc định chỉ lắng nghe 127.0.0.1; đặt reverse proxy HTTPS phía trước cho người dùng bên ngoài. Chạy một máy chủ ứng dụng với một thư mục SQLite bền vững, không dùng hệ thống tệp tạm thời của serverless.

Cấu hình production qua biến môi trường (tham khảo `.env.example`):

- `APP_ORIGIN`: URL HTTPS chính xác của website, không có dấu `/` cuối.
- `PHOTOBOOTH_DATA_DIR`: đường dẫn thư mục dữ liệu bền vững có quyền ghi.
- `ADMIN_SETUP_TOKEN`: chuỗi bí mật ngẫu nhiên dài, chỉ cần để tạo tài khoản đầu tiên ở `/admin/`. Nhập mã đó trong trang thiết lập cùng email/mật khẩu của bạn; có thể bỏ biến này sau khi tạo xong tài khoản. Không chia sẻ mã hoặc đưa vào mã phía khách.

Production không cho tạo tài khoản đầu tiên nếu thiếu mã thiết lập. Camera yêu cầu HTTPS hoặc localhost. Bản hiện tại đang chạy tại máy; chưa phát hành website công khai. Lần đăng ký Sites trước đó bị từ chối do hạn mức tài khoản.


## Phụ kiện AR

Trong booth, bật **Phụ kiện AR**, rồi chọn **Kính xanh**, **Tai mèo**, **Vương miện** hoặc **Nơ hồng**. Có thể kết hợp kính với một phụ kiện trên đầu, chỉnh kích thước 75–130%. Phụ kiện bám vị trí và góc nghiêng của tối đa hai khuôn mặt, tự ẩn khi không thấy mặt. Nên chụp chính diện với ánh sáng rõ.

Mô hình MediaPipe Face Landmarker được tải từ chính website chỉ khi bật AR (khoảng 15 MB lần đầu), chạy trong Web Worker trên trình duyệt. Không gửi ảnh hoặc điểm khuôn mặt đến dịch vụ nhận diện bên ngoài. Tài nguyên và nguồn ở `public/ar/SOURCES.md`.

AR được ghép vào ảnh mới chụp hoặc tải lên khi đang bật; PNG giữ đúng phụ kiện. Tắt AR chỉ áp dụng cho ảnh tiếp theo; muốn bỏ phụ kiện đã chụp cần chụp lại. Đây là phụ kiện 2D bám khuôn mặt; không mô phỏng che khuất 3D. Nếu trình duyệt không tải được AR, có thể thử lại hoặc tắt AR để tiếp tục chụp.

`src/lib/ar.ts` vẽ phụ kiện và quản lý worker; `src/hooks/use-ar.ts` điều phối nhận diện; `public/ar/worker.js` chạy mô hình. Các kiểm thử `tests/ar.spec.ts` và `tests/ar-live.spec.ts` dùng mô hình thật để kiểm tra lựa chọn, PNG, lỗi tải/thử lại, theo dõi chuyển động và mất khuôn mặt trên Edge. Webcam thật và Safari cần kiểm tra trên thiết bị đích.
