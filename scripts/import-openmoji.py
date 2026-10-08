import urllib.request,concurrent.futures,json
from pathlib import Path
groups={
'Biểu cảm': '1F600:Cười tươi,1F603:Vui vẻ,1F604:Cười híp mắt,1F601:Rạng rỡ,1F606:Cười lớn,1F605:Cười ngượng,1F602:Cười ra nước mắt,1F923:Cười lăn,1F609:Nháy mắt,1F60A:Mỉm cười,1F607:Thiên thần,1F970:Yêu thương,1F60D:Mắt trái tim,1F929:Mắt ngôi sao,1F618:Gửi nụ hôn,1F60B:Ngon quá,1F61B:Lè lưỡi,1F60E:Kính mát,1F973:Ăn mừng,1F917:Ôm một cái',
'Thú cưng': '1F431:Mèo,1F436:Cún,1F430:Thỏ,1F43B:Gấu,1F43C:Gấu trúc,1F428:Koala,1F42F:Hổ,1F981:Sư tử,1F984:Kỳ lân,1F98A:Cáo,1F439:Hamster,1F438:Ếch,1F424:Gà con,1F427:Chim cánh cụt,1F426:Chim nhỏ,1F989:Cú mèo,1F433:Cá voi,1F42C:Cá heo,1F419:Bạch tuộc,1F98B:Bươm bướm',
'Đồ ăn': '1F353:Dâu tây,1F352:Anh đào,1F349:Dưa hấu,1F351:Đào,1F34B:Chanh,1F34A:Quýt,1F34E:Táo,1F347:Nho,1F34C:Chuối,1F34D:Dứa,1F951:Bơ,1F354:Bánh burger,1F355:Pizza,1F369:Donut,1F36A:Bánh quy,1F382:Bánh sinh nhật,1F370:Bánh kem,1F366:Kem,1F36D:Kẹo mút,1F9CB:Trà sữa',
'Thiên nhiên': '1F338:Hoa anh đào,1F339:Hoa hồng,1F33B:Hướng dương,1F337:Tulip,1F33C:Hoa nhỏ,1F490:Bó hoa,1F340:Cỏ may mắn,1F331:Mầm xanh,1F335:Xương rồng,1F334:Cây dừa,1F308:Cầu vồng,2600:Mặt trời,2601:Mây,1F319:Trăng non,1F31D:Trăng cười,2B50:Ngôi sao,1F31F:Sao sáng,2728:Lấp lánh,2744:Bông tuyết,1F30A:Sóng biển',
'Yêu thương': '2764:Trái tim đỏ,1F499:Trái tim xanh,1F49A:Trái tim lá,1F49B:Trái tim vàng,1F49C:Trái tim tím,1F9E1:Trái tim cam,1F90D:Trái tim trắng,1F496:Tim lấp lánh,1F495:Hai trái tim,1F498:Tim mũi tên,1F49D:Tim quà tặng,1F48C:Thư tình,1F380:Nơ,1F381:Quà tặng,1F388:Bóng bay,1F389:Pháo giấy,1F38A:Confetti,1F451:Vương miện,1F48E:Kim cương,1F4AB:Sao băng'
}
items=[]
for group,values in groups.items():
 for value in values.split(','):
  code,name=value.split(':');items.append(dict(id=code,name=name,category=group,src='/stickers/'+code+'.svg'))
assert len(items)==100 and len({i['id'] for i in items})==100
out=Path('public/stickers');out.mkdir(exist_ok=True)
base='https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/'
def fetch(item):
 target=out/(item['id']+'.svg')
 if not target.exists():
  data=urllib.request.urlopen(base+'color/svg/'+item['id']+'.svg',timeout=35).read()
  if b'<svg' not in data or b'<script' in data: raise ValueError(item['id'])
  target.write_bytes(data)
 return item['id']
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: list(pool.map(fetch,items))
(out/'LICENSE.txt').write_bytes(urllib.request.urlopen(base+'LICENSE.txt',timeout=30).read())
Path('src/lib/sticker-catalog.ts').write_text('export const STICKER_CATALOG = '+json.dumps(items,ensure_ascii=False,indent=2)+' as const;\n',encoding='utf-8')
(out/'SOURCES.md').write_text('# Sticker credits\n\n100 unmodified color SVGs by OpenMoji (HfG Schwäbisch Gmünd and contributors).\nSource: https://github.com/hfg-gmuend/openmoji\nLicense: CC BY-SA 4.0 https://creativecommons.org/licenses/by-sa/4.0/\nFull license: LICENSE.txt. Filenames preserve original Unicode IDs.\nThese are OpenMoji assets, not Pinterest downloads. The user approved free attributed alternatives when Pinterest downloads were unavailable.\n',encoding='utf-8')
print('Downloaded and indexed',len(items),'stickers')

