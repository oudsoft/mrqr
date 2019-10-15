//decompress.js
const decodeOption = {inputEncoding: "StorageBinaryString", outputEncoding: "String"};

var LZUTF8 = require('lzutf8');

var compressed2 = '煔ⴸ㔳乩ѯٲ斝⏢䍊㤠珜碚伜㫓䭝ᣢ孂㝥峱䦾ᶵ垚݉暕姱榬岴䢎׍㮒㥍播姰沮ᰵफ़ⷥ⾚紫枟䕳毩㱶笮ⷝ枊筹斞影⯧簲竾╝徚⭷枊廳楧島⫾᷌彼憾ミᡯ䰷昛猍禆糃㹡弰澘㟌ᩦࢨ圽䉟䅁ỗ䋲⮠峰塾㐕排彡抸勰氥簕⫭㰯๺׏ҵ牊⃹㕴⹈㕟ໂ⿁Ⲝ煑朸ᗐ⹸撟ቒΈর煜⩹瑔湪䓶帳ᴅ构廳₮Ჵ笎ᗍஆ䕇掦幱⩧㲑栮㱤ᜐㄋモ屑㥬ዼ੩皼㎎ᤫ抽売①峑ࠞ㕭掆㤡枱䇳☨尳⥾Մ來伋悽䩳戣ᳳ᧎մ➊礋暋䧳渠㰷㯴缝縃䌟ῧ䁄秧眙ᮽ碮籗㸫引澊矅㯢己⻸坼⮾ᗟ૯䕷抻煝碮籗㸫引澊矅㯢己⻸坼⮾ᗟ૯䕷抻煝碮籗㸫引澊矅㯢己⻸坼⮾ᗟ૯䕷抻煝碮籗㸫引澊矅㯢己⻸坼⮾ᗟ૯䕷抻煝碮籗㸫引澊矅㯢崱⳵̦燑耂耀';
console.log('compressed2=> ' + compressed2);

var compressed1 = LZUTF8.decompress(compressed2, decodeOption);
console.log('compressed1=> ' + compressed1);

var conBack = LZUTF8.decompress(compressed1, decodeOption);
console.log('conBack=> ' + conBack);