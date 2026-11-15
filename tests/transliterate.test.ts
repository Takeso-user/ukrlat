import { describe, expect, test } from "bun:test";
import { transliterate, transliterateWithCase, translitMap } from "../src/transliterate";

const longUkrainianText =
  "Як священники в Єрусалимському храмі позбувалися крові принесених у жертву тварин? КОЖНОГО року ізраїльські священники приносили у жертву тисячі тварин. Йосиф Флавій, давньоєврейський історик першого століття, зазначає, що на Пасху у храмі різали понад 250 000 ягнят. Це означає, що мала лишатися величезна кількість крові (Лев. 1:10, 11; Чис. 28:16, 19). Як її позбувалися? На території храму, відбудованого Іродом, який проіснував до 70 року н. е., археологи знайшли складну дренажну систему. Очевидно, саме через неї кров відводилася з храмової гори. Розгляньмо дві особливості цієї системи, завдяки яким священники підтримували жертовник у чистоті. Отвори біля основи жертовника. Дренажна система жертовника описана в Мішні (збірка єврейського усного закону, укладена в першій половині III століття н. е.). У ній говориться, що біля одного з кутів жертовника було два отвори. Кров разом з водою, якою мили жертовник, стікала через ці отвори у канал, який виходив у річку Кедрон. Записана в Мішні інформація підтверджується археологічними знахідками. Біля Єрусалимського храму виявили канали, які, очевидно, використовувалися, щоб відводити воду разом з кров’ю принесених жертв («The Cambridge History of Judaism»). Подача великої кількості води. Щоб мити основу жертовника і стічні канали, потрібно багато води. У священників був постійний доступ до води завдяки міській системі водопостачання. Ця система складалася з каналів і акведуків, водозборів і купалень. Археолог Йосеф Патріх зазначив, що такої складної системи постачання і відведення води не мав жоден інший храм тих часів.";

const longTransliteration =
  "Âk svâščennyky v Êrusalymśkomu hrami pozbuvalysâ krovi prynesenyh u žertvu tvaryn? KOŽNOGO roku izraîĺśki svâščennyky prynosyly u žertvu tysâči tvaryn. Josyf Flavij, davńoêvrejśkyj istoryk peršogo stolittâ, zaznačaê, ščo na Pashu u hrami rizaly ponad 250 000 âgnât. Ce označaê, ščo mala lyšatysâ velyčezna kiĺkisť krovi (Lev. 1:10, 11; Čys. 28:16, 19). Âk îî pozbuvalysâ? Na terytoriî hramu, vidbudovanogo Irodom, âkyj proisnuvav do 70 roku n. e., arheology znajšly skladnu drenažnu systemu. Očevydno, same čerez neî krov vidvodylasâ z hramovoî gory. Rozglâńmo dvi osoblyvosti ciêî systemy, zavdâky âkym svâščennyky pidtrymuvaly žertovnyk u čystoti. Otvory bilâ osnovy žertovnyka. Drenažna systema žertovnyka opysana v Mišni (zbirka êvrejśkogo usnogo zakonu, ukladena v peršij polovyni III stolittâ n. e.). U nij govoryťsâ, ščo bilâ odnogo z kutiv žertovnyka bulo dva otvory. Krov razom z vodoû, âkoû myly žertovnyk, stikala čerez ci otvory u kanal, âkyj vyhodyv u ričku Kedron. Zapysana v Mišni informaciâ pidtverdžuêťsâ arheologičnymy znahidkamy. Bilâ Êrusalymśkogo hramu vyâvyly kanaly, âki, očevydno, vykorystovuvalysâ, ščob vidvodyty vodu razom z krov’û prynesenyh žertv («The Cambridge History of Judaism»). Podača velykoî kiĺkosti vody. Ščob myty osnovu žertovnyka i stični kanaly, potribno bagato vody. U svâščennykiv buv postijnyj dostup do vody zavdâky miśkij systemi vodopostačannâ. Câ systema skladalasâ z kanaliv i akvedukiv, vodozboriv i kupaleń. Arheolog Josef Patrih zaznačyv, ščo takoî skladnoî systemy postačannâ i vidvedennâ vody ne mav žoden inšyj hram tyh časiv.";

describe("transliterate module", () => {
  test("transliterates simple Ukrainian text", () => {
    expect(transliterate("привіт")).toBe("pryvit");
    expect(transliterate("Київ")).toBe("Kyîv");
    expect(transliterate("Щастя")).toBe("Ščastâ");
    expect(transliterate("Україна")).toBe("Ukraîna");
  });

  test("transliterates long Ukrainian text accurately", () => {
    expect(transliterate(longUkrainianText)).toBe(longTransliteration);
  });

  test("handles mixed case and capitalization", () => {
    expect(transliterate("Дніпро")).toBe("Dnipro");
    expect(transliterate("СЬОГОДНІ")).toBe("ŚOGODNI");
    expect(transliterate("Львів")).toBe("Ĺviv");
    expect(transliterate("ЛЬВІВ")).toBe("ĹVIV");
  });

  test("returns non-Cyrillic characters, numbers, and punctuation unchanged", () => {
    expect(transliterate("Hello World!")).toBe("Hello World!");
    expect(transliterate("12345?!@#$%^&*()")).toBe("12345?!@#$%^&*()");
    expect(transliterate("м'яч")).toBe("m'âč");
    expect(transliterate("сім’я")).toBe("sim’â");
  });

  test("handles empty string and falsy input", () => {
    expect(transliterate("")).toBe("");
  });

  test("handles all soft sign combinations in lowercase and uppercase", () => {
    const pairs = [
      ["дь", "ď"],
      ["ДЬ", "Ď"],
      ["Дь", "Ď"],
      ["зь", "ź"],
      ["ЗЬ", "Ź"],
      ["Зь", "Ź"],
      ["ль", "ĺ"],
      ["ЛЬ", "Ĺ"],
      ["Ль", "Ĺ"],
      ["нь", "ń"],
      ["НЬ", "Ń"],
      ["Нь", "Ń"],
      ["рь", "ŕ"],
      ["РЬ", "Ŕ"],
      ["Рь", "Ŕ"],
      ["сь", "ś"],
      ["СЬ", "Ś"],
      ["Сь", "Ś"],
      ["ть", "ť"],
      ["ТЬ", "Ť"],
      ["Ть", "Ť"],
      ["ць", "ć"],
      ["ЦЬ", "Ć"],
      ["Ць", "Ć"],
    ];

    for (const [input, expected] of pairs) {
      expect(transliterate(input)).toBe(expected);
    }
  });

  test("handles digraph щ / Щ correctly", () => {
    expect(transliterate("щ")).toBe("šč");
    expect(transliterate("Щ")).toBe("Šč");
    expect(transliterate("борщ")).toBe("boršč");
    expect(transliterate("Щука")).toBe("Ščuka");
  });

  test("covers all single character mappings in translitMap", () => {
    for (const [cyrillic, latin] of Object.entries(translitMap)) {
      expect(transliterate(cyrillic)).toBe(latin);
    }
  });
});

describe("transliterateWithCase", () => {
  test("preserves all-uppercase for words that were uppercase", () => {
    expect(transliterateWithCase("КОЖНОГО РОКУ")).toBe("KOŽNOGO ROKU");
    expect(transliterateWithCase("СЬОГОДНІ")).toBe("ŚOGODNI");
    expect(transliterateWithCase("КИЇВ - СТОЛИЦЯ")).toBe("KYÎV - STOLYCÂ");
  });

  test("keeps titlecase / lowercase words unchanged in case", () => {
    expect(transliterateWithCase("Привіт усім!")).toBe("Pryvit usim!");
  });

  test("handles empty string gracefully", () => {
    expect(transliterateWithCase("")).toBe("");
  });
});
