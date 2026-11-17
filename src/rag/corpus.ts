export interface Doc {
  id: string;
  title: string;
  text: string;
}

// Tüm içerik kurgusaldır, hiçbir gerçek banka belgesinden alınmamıştır.
export const corpus: Doc[] = [
  {
    id: 'urun',
    title: 'KOBİ İşletme Kredisi Ürün Şartları',
    text: `## Kapsam ve vade
KOBİ işletme kredisi 12 ile 60 ay arasında vadeyle kullandırılır. Kredi tutarı 250.000 TL ile 20.000.000 TL arasındadır. Başvuru için işletmenin en az 2 yıldır faaliyette olması gerekir.

## Faiz ve masraflar
Faiz oranı vade boyunca aylık sabittir. Dosya masrafı kredi tutarının binde 5'idir. Tahsis ücreti alınmaz. Yasal vergiler ayrıca yansıtılır.

## Ödeme planı
Krediler eşit taksitle ve aylık olarak geri ödenir. İlk taksit kullandırımdan 30 gün sonra başlar. Kullandırım tutarı aynı gün müşterinin hesabına aktarılır.`,
  },
  {
    id: 'erken',
    title: 'Erken Kapama ve Kısmi Ödeme',
    text: `## Erken kapama komisyonu
Kredinin ilk 12 ayında erken kapamada kalan anaparanın yüzde 2'si komisyon alınır. 12. aydan sonra bu oran yüzde 1'dir. Vadenin son 6 ayında erken kapama komisyonu alınmaz.

## Kısmi ödeme
Kısmi ödeme en az 100.000 TL olmalıdır. Müşteri taksit tutarını azaltmayı ya da vadeyi kısaltmayı seçebilir.

## Gecikme
Taksitin 15 günden fazla gecikmesi halinde gecikme faizi, sözleşme faizinin yüzde 30 fazlası olarak uygulanır.`,
  },
  {
    id: 'teminat',
    title: 'Teminat ve Başvuru Süreci',
    text: `## Teminat
2.000.000 TL'ye kadar olan kredilerde KGF kefaleti kabul edilir. Daha yüksek tutarlarda gayrimenkul ipoteği, nakit blokaj veya ortak kefaleti istenir.

## Başvuru belgeleri
Vergi levhası, son iki yılın bilançosu, ticaret sicil gazetesi ve imza sirküleri gerekir.

## Değerlendirme süresi
Eksiksiz dosyalar 3 iş günü içinde değerlendirilir.`,
  },
];