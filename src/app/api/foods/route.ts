import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Cloudinary images mapping - Each dish uses ONLY its specific images
const cloudinaryImages: { [key: string]: string[] } = {
  'Asado': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348514/food-guessing-game/argentina/asado/asado_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348521/food-guessing-game/argentina/asado/asado_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348524/food-guessing-game/argentina/asado/asado_3.jpg.jpg',
  ],
  'Empanadas': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348491/food-guessing-game/argentina/empanadas/empanadas_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348497/food-guessing-game/argentina/empanadas/empanadas_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348502/food-guessing-game/argentina/empanadas/empanadas_3.jpg.jpg',
  ],
  'Morcilla Blood Sausage': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348465/food-guessing-game/argentina/morcilla-blood-sausage/morcilla_blood_sausage_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348474/food-guessing-game/argentina/morcilla-blood-sausage/morcilla_blood_sausage_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348479/food-guessing-game/argentina/morcilla-blood-sausage/morcilla_blood_sausage_3.jpg.jpg',
  ],
  'Lamington': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348880/food-guessing-game/australia/lamington/lamington_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348886/food-guessing-game/australia/lamington/lamington_2.jpg.jpg',
  ],
  'Meat Pie': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348900/food-guessing-game/australia/meat-pie/meat_pie_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348904/food-guessing-game/australia/meat-pie/meat_pie_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348908/food-guessing-game/australia/meat-pie/meat_pie_3.jpg.jpg',
  ],
  'Witchetty Grub': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348859/food-guessing-game/australia/witchetty-grub/witchetty_grub_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348867/food-guessing-game/australia/witchetty-grub/witchetty_grub_2.jpg.jpg',
  ],
  'Buchada De Bode': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349004/food-guessing-game/brazil/buchada-de-bode/buchada_de_bode_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349011/food-guessing-game/brazil/buchada-de-bode/buchada_de_bode_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349029/food-guessing-game/brazil/buchada-de-bode/buchada_de_bode_3.jpg.png',
  ],
  'Feijoada': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349065/food-guessing-game/brazil/feijoada/feijoada_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349071/food-guessing-game/brazil/feijoada/feijoada_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349075/food-guessing-game/brazil/feijoada/feijoada_3.jpg.jpg',
  ],
  'P O De Queijo': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349041/food-guessing-game/brazil/p%C3%A3o-de-queijo/p_o_de_queijo_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349048/food-guessing-game/brazil/p%C3%A3o-de-queijo/p_o_de_queijo_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349052/food-guessing-game/brazil/p%C3%A3o-de-queijo/p_o_de_queijo_3.jpg.jpg',
  ],
  'Poutine': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349162/food-guessing-game/canada/poutine/poutine_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349172/food-guessing-game/canada/poutine/poutine_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349177/food-guessing-game/canada/poutine/poutine_3.jpg.jpg',
  ],
  'Chow Mein': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350038/food-guessing-game/china/chow-mein/chow_mein_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350044/food-guessing-game/china/chow-mein/chow_mein_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350048/food-guessing-game/china/chow-mein/chow_mein_3.jpg.jpg',
  ],
  'Dim Sum': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350129/food-guessing-game/china/dim-sum/dim_sum_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350134/food-guessing-game/china/dim-sum/dim_sum_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350138/food-guessing-game/china/dim-sum/dim_sum_3.jpg.jpg',
  ],
  'Fortune Cookies': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350011/food-guessing-game/china/fortune-cookies/fortune_cookies_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350020/food-guessing-game/china/fortune-cookies/fortune_cookies_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350024/food-guessing-game/china/fortune-cookies/fortune_cookies_3.jpg.jpg',
  ],
  'Mooncakes': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350062/food-guessing-game/china/mooncakes/mooncakes_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350067/food-guessing-game/china/mooncakes/mooncakes_2.jpg.png',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350070/food-guessing-game/china/mooncakes/mooncakes_3.jpg.jpg',
  ],
  'Peking Duck': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350153/food-guessing-game/china/peking-duck/peking_duck_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350159/food-guessing-game/china/peking-duck/peking_duck_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350162/food-guessing-game/china/peking-duck/peking_duck_3.jpg.jpg',
  ],
  'Ajiaco': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348335/food-guessing-game/colombia/ajiaco/ajiaco_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348342/food-guessing-game/colombia/ajiaco/ajiaco_2.jpg.jpg',
  ],
  'Bandeja Paisa': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348355/food-guessing-game/colombia/bandeja-paisa/bandeja_paisa_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348361/food-guessing-game/colombia/bandeja-paisa/bandeja_paisa_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348370/food-guessing-game/colombia/bandeja-paisa/bandeja_paisa_3.jpg.jpg',
  ],
  'Hormigas Culonas': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348312/food-guessing-game/colombia/hormigas-culonas/hormigas_culonas_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348324/food-guessing-game/colombia/hormigas-culonas/hormigas_culonas_2.jpg.jpg',
  ],
  'Feseekh': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348026/food-guessing-game/egypt/feseekh/feseekh_1.jpg.jpg',
  ],
  'Ful Medames': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348044/food-guessing-game/egypt/ful-medames/ful_medames_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348050/food-guessing-game/egypt/ful-medames/ful_medames_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348055/food-guessing-game/egypt/ful-medames/ful_medames_3.jpg.jpg',
  ],
  'Koshary': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348077/food-guessing-game/egypt/koshary/koshary_1.jpg.jpg',
  ],
  'Injera': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759341131/food-guessing-game/ethiopia/injera/injera_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759341133/food-guessing-game/ethiopia/injera/injera_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759341134/food-guessing-game/ethiopia/injera/injera_3.jpg.jpg',
  ],
  'Kitfo': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348815/food-guessing-game/ethiopia/kitfo/kitfo_1.jpg.jpg',
  ],
  'Coq Au Vin': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349709/food-guessing-game/france/coq-au-vin/coq_au_vin_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349714/food-guessing-game/france/coq-au-vin/coq_au_vin_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349719/food-guessing-game/france/coq-au-vin/coq_au_vin_3.jpg.jpg',
  ],
  'Cr Pes': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349621/food-guessing-game/france/cr%C3%AApes/cr_pes_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349627/food-guessing-game/france/cr%C3%AApes/cr_pes_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349631/food-guessing-game/france/cr%C3%AApes/cr_pes_3.jpg.jpg',
  ],
  'Escargots De Bourgogne': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349687/food-guessing-game/france/escargots-de-bourgogne/escargots_de_bourgogne_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349692/food-guessing-game/france/escargots-de-bourgogne/escargots_de_bourgogne_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349695/food-guessing-game/france/escargots-de-bourgogne/escargots_de_bourgogne_3.jpg.jpg',
  ],
  'Foie Gras': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349654/food-guessing-game/france/foie-gras/foie_gras_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349660/food-guessing-game/france/foie-gras/foie_gras_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349664/food-guessing-game/france/foie-gras/foie_gras_3.jpg.jpg',
  ],
  'French Onion Soup': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349594/food-guessing-game/france/french-onion-soup/french_onion_soup_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349601/food-guessing-game/france/french-onion-soup/french_onion_soup_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349605/food-guessing-game/france/french-onion-soup/french_onion_soup_3.jpg.jpg',
  ],
  'Profiteroles': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349537/food-guessing-game/france/profiteroles/profiteroles_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349547/food-guessing-game/france/profiteroles/profiteroles_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349552/food-guessing-game/france/profiteroles/profiteroles_3.jpg.jpg',
  ],
  'Quiche Lorraine': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349566/food-guessing-game/france/quiche-lorraine/quiche_lorraine_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349571/food-guessing-game/france/quiche-lorraine/quiche_lorraine_2.jpg.jpg',
  ],
  'Bratwurst': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348710/food-guessing-game/germany/bratwurst/bratwurst_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348715/food-guessing-game/germany/bratwurst/bratwurst_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348719/food-guessing-game/germany/bratwurst/bratwurst_3.jpg.jpg',
  ],
  'Mett': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348665/food-guessing-game/germany/mett/mett_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348672/food-guessing-game/germany/mett/mett_2.jpg.jpg',
  ],
  'Sauerkraut': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348687/food-guessing-game/germany/sauerkraut/sauerkraut_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348693/food-guessing-game/germany/sauerkraut/sauerkraut_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348696/food-guessing-game/germany/sauerkraut/sauerkraut_3.jpg.jpg',
  ],
  'Kokoretsi': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348732/food-guessing-game/greece/kokoretsi/kokoretsi_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348742/food-guessing-game/greece/kokoretsi/kokoretsi_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348747/food-guessing-game/greece/kokoretsi/kokoretsi_3.jpg.jpg',
  ],
  'Moussaka': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348794/food-guessing-game/greece/moussaka/moussaka_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348799/food-guessing-game/greece/moussaka/moussaka_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348803/food-guessing-game/greece/moussaka/moussaka_3.jpg.jpg',
  ],
  'Souvlaki': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348759/food-guessing-game/greece/souvlaki/souvlaki_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348765/food-guessing-game/greece/souvlaki/souvlaki_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348771/food-guessing-game/greece/souvlaki/souvlaki_3.jpg.jpg',
  ],
  'H Karl': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349189/food-guessing-game/iceland/h%C3%A1karl/h_karl_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349199/food-guessing-game/iceland/h%C3%A1karl/h_karl_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349202/food-guessing-game/iceland/h%C3%A1karl/h_karl_3.jpg.jpg',
  ],
  'Kj Ts Pa Lamb Soup': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349236/food-guessing-game/iceland/kj%C3%B6ts%C3%BApa-lamb-soup/kj_ts_pa_lamb_soup_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349241/food-guessing-game/iceland/kj%C3%B6ts%C3%BApa-lamb-soup/kj_ts_pa_lamb_soup_2.jpg.jpg',
  ],
  'Pylsur': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349262/food-guessing-game/iceland/pylsur/pylsur_1.jpg.png',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349267/food-guessing-game/iceland/pylsur/pylsur_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349271/food-guessing-game/iceland/pylsur/pylsur_3.jpg.jpg',
  ],
  'Biryani': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350345/food-guessing-game/india/biryani/biryani_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350350/food-guessing-game/india/biryani/biryani_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350353/food-guessing-game/india/biryani/biryani_3.jpg.jpg',
  ],
  'Chicken Tikka Masala': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350294/food-guessing-game/india/chicken-tikka-masala/chicken_tikka_masala_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350300/food-guessing-game/india/chicken-tikka-masala/chicken_tikka_masala_2.jpg.jpg',
  ],
  'Kulfi': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350219/food-guessing-game/india/kulfi/kulfi_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350224/food-guessing-game/india/kulfi/kulfi_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350227/food-guessing-game/india/kulfi/kulfi_3.jpg.jpg',
  ],
  'Palak Paneer': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350275/food-guessing-game/india/palak-paneer/palak_paneer_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350280/food-guessing-game/india/palak-paneer/palak_paneer_2.jpg.jpg',
  ],
  'Raita': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350175/food-guessing-game/india/raita/raita_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350182/food-guessing-game/india/raita/raita_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350186/food-guessing-game/india/raita/raita_3.jpg.jpg',
  ],
  'Rogan Josh': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350239/food-guessing-game/india/rogan-josh/rogan_josh_1.jpg.jpg',
  ],
  'Samosa': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350323/food-guessing-game/india/samosa/samosa_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350328/food-guessing-game/india/samosa/samosa_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350332/food-guessing-game/india/samosa/samosa_3.jpg.jpg',
  ],
  'Vindaloo': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350198/food-guessing-game/india/vindaloo/vindaloo_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350204/food-guessing-game/india/vindaloo/vindaloo_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350207/food-guessing-game/india/vindaloo/vindaloo_3.jpg.jpg',
  ],
  'Gado Gado': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347652/food-guessing-game/indonesia/gado-gado/gado_gado_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347664/food-guessing-game/indonesia/gado-gado/gado_gado_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347668/food-guessing-game/indonesia/gado-gado/gado_gado_3.jpg.jpg',
  ],
  'Nasi Goreng': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347707/food-guessing-game/indonesia/nasi-goreng/nasi_goreng_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347713/food-guessing-game/indonesia/nasi-goreng/nasi_goreng_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347717/food-guessing-game/indonesia/nasi-goreng/nasi_goreng_3.jpg.jpg',
  ],
  'Rendang': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347681/food-guessing-game/indonesia/rendang/rendang_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347685/food-guessing-game/indonesia/rendang/rendang_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347690/food-guessing-game/indonesia/rendang/rendang_3.jpg.jpg',
  ],
  'Arancini': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350853/food-guessing-game/italy/arancini/arancini_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350858/food-guessing-game/italy/arancini/arancini_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350861/food-guessing-game/italy/arancini/arancini_3.jpg.jpg',
  ],
  'Bruschetta': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350810/food-guessing-game/italy/bruschetta/bruschetta_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350815/food-guessing-game/italy/bruschetta/bruschetta_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350818/food-guessing-game/italy/bruschetta/bruschetta_3.jpg.jpg',
  ],
  'Cannoli': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350831/food-guessing-game/italy/cannoli/cannoli_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350836/food-guessing-game/italy/cannoli/cannoli_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350840/food-guessing-game/italy/cannoli/cannoli_3.jpg.jpg',
  ],
  'Casu Marzu': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350931/food-guessing-game/italy/casu-marzu/casu_marzu_1.jpg.jpg',
  ],
  'Minestrone': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350788/food-guessing-game/italy/minestrone/minestrone_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350797/food-guessing-game/italy/minestrone/minestrone_2.jpg.jpg',
  ],
  'Panna Cotta': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350875/food-guessing-game/italy/panna-cotta/panna_cotta_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350880/food-guessing-game/italy/panna-cotta/panna_cotta_2.jpg.jpg',
  ],
  'Spaghetti Carbonara': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350893/food-guessing-game/italy/spaghetti-carbonara/spaghetti_carbonara_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350898/food-guessing-game/italy/spaghetti-carbonara/spaghetti_carbonara_2.jpg.jpg',
  ],
  'Chirashi': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350618/food-guessing-game/japan/chirashi/chirashi_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350627/food-guessing-game/japan/chirashi/chirashi_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350632/food-guessing-game/japan/chirashi/chirashi_3.jpg.jpg',
  ],
  'Karaage': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350571/food-guessing-game/japan/karaage/karaage_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350577/food-guessing-game/japan/karaage/karaage_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350580/food-guessing-game/japan/karaage/karaage_3.jpg.jpg',
  ],
  'Mochi': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350592/food-guessing-game/japan/mochi/mochi_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350597/food-guessing-game/japan/mochi/mochi_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350601/food-guessing-game/japan/mochi/mochi_3.jpg.jpg',
  ],
  'Onigiri': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350543/food-guessing-game/japan/onigiri/onigiri_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350553/food-guessing-game/japan/onigiri/onigiri_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350557/food-guessing-game/japan/onigiri/onigiri_3.jpg.jpg',
  ],
  'Ramen': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350745/food-guessing-game/japan/ramen/ramen_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350752/food-guessing-game/japan/ramen/ramen_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350755/food-guessing-game/japan/ramen/ramen_3.jpg.jpg',
  ],
  'Sashimi': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350645/food-guessing-game/japan/sashimi/sashimi_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350650/food-guessing-game/japan/sashimi/sashimi_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350654/food-guessing-game/japan/sashimi/sashimi_3.jpg.jpg',
  ],
  'Shirako': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350724/food-guessing-game/japan/shirako/shirako_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350729/food-guessing-game/japan/shirako/shirako_2.jpg.png',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350732/food-guessing-game/japan/shirako/shirako_3.jpg.png',
  ],
  'Sushi': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350768/food-guessing-game/japan/sushi/sushi_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350772/food-guessing-game/japan/sushi/sushi_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350776/food-guessing-game/japan/sushi/sushi_3.jpg.jpg',
  ],
  'Tonkatsu': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350691/food-guessing-game/japan/tonkatsu/tonkatsu_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350696/food-guessing-game/japan/tonkatsu/tonkatsu_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350700/food-guessing-game/japan/tonkatsu/tonkatsu_3.jpg.jpg',
  ],
  'Udon': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350667/food-guessing-game/japan/udon/udon_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350673/food-guessing-game/japan/udon/udon_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350677/food-guessing-game/japan/udon/udon_3.jpg.jpg',
  ],
  'Fattoush': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759341122/food-guessing-game/lebanon/fattoush/fattoush_1.jpg.jpg',
  ],
  'Hummus': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347632/food-guessing-game/lebanon/hummus/hummus_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347636/food-guessing-game/lebanon/hummus/hummus_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347640/food-guessing-game/lebanon/hummus/hummus_3.jpg.jpg',
  ],
  'Kibbeh': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759341111/food-guessing-game/lebanon/kibbeh/kibbeh_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759341113/food-guessing-game/lebanon/kibbeh/kibbeh_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759341114/food-guessing-game/lebanon/kibbeh/kibbeh_3.jpg.jpg',
  ],
  'Enchiladas': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350451/food-guessing-game/mexico/enchiladas/enchiladas_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350459/food-guessing-game/mexico/enchiladas/enchiladas_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350463/food-guessing-game/mexico/enchiladas/enchiladas_3.jpg.jpg',
  ],
  'Escamoles': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350486/food-guessing-game/mexico/escamoles/escamoles_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350492/food-guessing-game/mexico/escamoles/escamoles_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350495/food-guessing-game/mexico/escamoles/escamoles_3.jpg.jpg',
  ],
  'Guacamole': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350367/food-guessing-game/mexico/guacamole/guacamole_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350379/food-guessing-game/mexico/guacamole/guacamole_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350383/food-guessing-game/mexico/guacamole/guacamole_3.jpg.jpg',
  ],
  'Pozole': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350418/food-guessing-game/mexico/pozole/pozole_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350424/food-guessing-game/mexico/pozole/pozole_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350427/food-guessing-game/mexico/pozole/pozole_3.jpg.jpg',
  ],
  'Tacos Al Pastor': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350521/food-guessing-game/mexico/tacos-al-pastor/tacos_al_pastor_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350526/food-guessing-game/mexico/tacos-al-pastor/tacos_al_pastor_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350529/food-guessing-game/mexico/tacos-al-pastor/tacos_al_pastor_3.jpg.jpg',
  ],
  'Tres Leches Cake': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350396/food-guessing-game/mexico/tres-leches-cake/tres_leches_cake_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759350406/food-guessing-game/mexico/tres-leches-cake/tres_leches_cake_2.jpg.jpg',
  ],
  'Couscous': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348562/food-guessing-game/morocco/couscous/couscous_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348567/food-guessing-game/morocco/couscous/couscous_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348571/food-guessing-game/morocco/couscous/couscous_3.jpg.jpg',
  ],
  'Khlii': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348538/food-guessing-game/morocco/khlii/khlii_1.jpg.jpg',
  ],
  'Tagine': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348583/food-guessing-game/morocco/tagine/tagine_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348589/food-guessing-game/morocco/tagine/tagine_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348592/food-guessing-game/morocco/tagine/tagine_3.jpg.jpg',
  ],
  'H Ngi': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348201/food-guessing-game/new-zealand/h%C4%81ngi/h_ngi_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348207/food-guessing-game/new-zealand/h%C4%81ngi/h_ngi_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348212/food-guessing-game/new-zealand/h%C4%81ngi/h_ngi_3.jpg.jpg',
  ],
  'Pavlova': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348169/food-guessing-game/new-zealand/pavlova/pavlova_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348182/food-guessing-game/new-zealand/pavlova/pavlova_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348188/food-guessing-game/new-zealand/pavlova/pavlova_3.jpg.jpg',
  ],
  'Jollof Rice': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348271/food-guessing-game/nigeria/jollof-rice/jollof_rice_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348277/food-guessing-game/nigeria/jollof-rice/jollof_rice_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348280/food-guessing-game/nigeria/jollof-rice/jollof_rice_3.jpg.jpg',
  ],
  'Suya': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348246/food-guessing-game/nigeria/suya/suya_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348253/food-guessing-game/nigeria/suya/suya_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348257/food-guessing-game/nigeria/suya/suya_3.jpg.jpg',
  ],
  'Lutefisk': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347856/food-guessing-game/norway/lutefisk/lutefisk_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347861/food-guessing-game/norway/lutefisk/lutefisk_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347865/food-guessing-game/norway/lutefisk/lutefisk_3.jpg.jpg',
  ],
  'Rakfisk': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347832/food-guessing-game/norway/rakfisk/rakfisk_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347838/food-guessing-game/norway/rakfisk/rakfisk_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347842/food-guessing-game/norway/rakfisk/rakfisk_3.jpg.jpg',
  ],
  'Smalahove': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347799/food-guessing-game/norway/smalahove/smalahove_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347809/food-guessing-game/norway/smalahove/smalahove_2.jpg.jpg',
  ],
  'Ceviche': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349118/food-guessing-game/peru/ceviche/ceviche_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349124/food-guessing-game/peru/ceviche/ceviche_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349128/food-guessing-game/peru/ceviche/ceviche_3.jpg.jpg',
  ],
  'Lomo Saltado': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759341143/food-guessing-game/peru/lomo-saltado/lomo_saltado_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759341144/food-guessing-game/peru/lomo-saltado/lomo_saltado_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759341147/food-guessing-game/peru/lomo-saltado/lomo_saltado_3.jpg.jpg',
  ],
  'Adobo': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348958/food-guessing-game/philippines/adobo/adobo_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348964/food-guessing-game/philippines/adobo/adobo_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348969/food-guessing-game/philippines/adobo/adobo_3.jpg.jpg',
  ],
  'Lechon': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348931/food-guessing-game/philippines/lechon/lechon_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348942/food-guessing-game/philippines/lechon/lechon_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348946/food-guessing-game/philippines/lechon/lechon_3.jpg.jpg',
  ],
  'Bigos': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347753/food-guessing-game/poland/bigos/bigos_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347759/food-guessing-game/poland/bigos/bigos_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347763/food-guessing-game/poland/bigos/bigos_3.jpg.jpg',
  ],
  'Pierogi': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347778/food-guessing-game/poland/pierogi/pierogi_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347783/food-guessing-game/poland/pierogi/pierogi_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347787/food-guessing-game/poland/pierogi/pierogi_3.jpg.jpg',
  ],
  ' Urek': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347730/food-guessing-game/poland/%C5%BCurek/_urek_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347736/food-guessing-game/poland/%C5%BCurek/_urek_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347740/food-guessing-game/poland/%C5%BCurek/_urek_3.jpg.jpg',
  ],
  'Bacalhau   Br S': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347906/food-guessing-game/portugal/bacalhau-%C3%A0-br%C3%A1s/bacalhau___br_s_1.jpg.jpg',
  ],
  'Francesinha': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347879/food-guessing-game/portugal/francesinha/francesinha_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347888/food-guessing-game/portugal/francesinha/francesinha_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347892/food-guessing-game/portugal/francesinha/francesinha_3.jpg.jpg',
  ],
  'Pastel De Nata': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347921/food-guessing-game/portugal/pastel-de-nata/pastel_de_nata_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347926/food-guessing-game/portugal/pastel-de-nata/pastel_de_nata_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347930/food-guessing-game/portugal/pastel-de-nata/pastel_de_nata_3.jpg.jpg',
  ],
  'Biltong': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348615/food-guessing-game/south-africa/biltong/biltong_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348625/food-guessing-game/south-africa/biltong/biltong_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348630/food-guessing-game/south-africa/biltong/biltong_3.jpg.jpg',
  ],
  'Bobotie': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348644/food-guessing-game/south-africa/bobotie/bobotie_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348649/food-guessing-game/south-africa/bobotie/bobotie_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348653/food-guessing-game/south-africa/bobotie/bobotie_3.jpg.jpg',
  ],
  'Bibimbap': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349299/food-guessing-game/south-korea/bibimbap/bibimbap_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349305/food-guessing-game/south-korea/bibimbap/bibimbap_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349310/food-guessing-game/south-korea/bibimbap/bibimbap_3.jpg.jpg',
  ],
  'Kimchi': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349323/food-guessing-game/south-korea/kimchi/kimchi_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349328/food-guessing-game/south-korea/kimchi/kimchi_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349332/food-guessing-game/south-korea/kimchi/kimchi_3.jpg.jpg',
  ],
  'Sannakji': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349284/food-guessing-game/south-korea/sannakji/sannakji_1.jpg.jpg',
  ],
  'Percebes Gooseneck Barnacles': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349486/food-guessing-game/spain/percebes-gooseneck-barnacles/percebes_gooseneck_barnacles_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349496/food-guessing-game/spain/percebes-gooseneck-barnacles/percebes_gooseneck_barnacles_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349500/food-guessing-game/spain/percebes-gooseneck-barnacles/percebes_gooseneck_barnacles_3.jpg.jpg',
  ],
  'Gravlax': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348412/food-guessing-game/sweden/gravlax/gravlax_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348417/food-guessing-game/sweden/gravlax/gravlax_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348421/food-guessing-game/sweden/gravlax/gravlax_3.jpg.jpg',
  ],
  'K Ttbullar': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348434/food-guessing-game/sweden/k%C3%B6ttbullar/k_ttbullar_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348440/food-guessing-game/sweden/k%C3%B6ttbullar/k_ttbullar_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348443/food-guessing-game/sweden/k%C3%B6ttbullar/k_ttbullar_3.jpg.jpg',
  ],
  'Surstr Mming': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348383/food-guessing-game/sweden/surstr%C3%B6mming/surstr_mming_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348395/food-guessing-game/sweden/surstr%C3%B6mming/surstr_mming_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348399/food-guessing-game/sweden/surstr%C3%B6mming/surstr_mming_3.jpg.jpg',
  ],
  'Pad Thai': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759341156/food-guessing-game/thailand/pad-thai/pad_thai_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759341157/food-guessing-game/thailand/pad-thai/pad_thai_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759341159/food-guessing-game/thailand/pad-thai/pad_thai_3.jpg.jpg',
  ],
  'Tom Yum Goong': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349441/food-guessing-game/thailand/tom-yum-goong/tom_yum_goong_1.jpg.jpg',
  ],
  'Baklava': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347983/food-guessing-game/turkey/baklava/baklava_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347988/food-guessing-game/turkey/baklava/baklava_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347992/food-guessing-game/turkey/baklava/baklava_3.jpg.jpg',
  ],
  'Doner Kebab': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348006/food-guessing-game/turkey/doner-kebab/doner_kebab_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348011/food-guessing-game/turkey/doner-kebab/doner_kebab_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348014/food-guessing-game/turkey/doner-kebab/doner_kebab_3.jpg.jpg',
  ],
  'Kuzu Kelle': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347957/food-guessing-game/turkey/kuzu-kelle/kuzu_kelle_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347963/food-guessing-game/turkey/kuzu-kelle/kuzu_kelle_2.jpg.png',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759347968/food-guessing-game/turkey/kuzu-kelle/kuzu_kelle_3.jpg.jpg',
  ],
  'Fish And Chips': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348138/food-guessing-game/uk/fish-and-chips/fish_and_chips_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348143/food-guessing-game/uk/fish-and-chips/fish_and_chips_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348148/food-guessing-game/uk/fish-and-chips/fish_and_chips_3.jpg.jpg',
  ],
  'Haggis': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348115/food-guessing-game/uk/haggis/haggis_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348121/food-guessing-game/uk/haggis/haggis_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348124/food-guessing-game/uk/haggis/haggis_3.jpg.jpg',
  ],
  'Stargazy Pie': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348092/food-guessing-game/uk/stargazy-pie/stargazy_pie_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348098/food-guessing-game/uk/stargazy-pie/stargazy_pie_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759348103/food-guessing-game/uk/stargazy-pie/stargazy_pie_3.jpg.jpg',
  ],
  'Buffalo Wings': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349939/food-guessing-game/usa/buffalo-wings/buffalo_wings_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349945/food-guessing-game/usa/buffalo-wings/buffalo_wings_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349948/food-guessing-game/usa/buffalo-wings/buffalo_wings_3.jpg.jpg',
  ],
  'Caesar Salad': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349918/food-guessing-game/usa/caesar-salad/caesar_salad_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349923/food-guessing-game/usa/caesar-salad/caesar_salad_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349927/food-guessing-game/usa/caesar-salad/caesar_salad_3.jpg.jpg',
  ],
  'Chicken And Waffles': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349829/food-guessing-game/usa/chicken-and-waffles/chicken_and_waffles_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349835/food-guessing-game/usa/chicken-and-waffles/chicken_and_waffles_2.jpg.jpg',
  ],
  'Chocolate Chip Cookies': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349743/food-guessing-game/usa/chocolate-chip-cookies/chocolate_chip_cookies_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349752/food-guessing-game/usa/chocolate-chip-cookies/chocolate_chip_cookies_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349757/food-guessing-game/usa/chocolate-chip-cookies/chocolate_chip_cookies_3.jpg.jpg',
  ],
  'Clam Chowder': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349789/food-guessing-game/usa/clam-chowder/clam_chowder_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349793/food-guessing-game/usa/clam-chowder/clam_chowder_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349797/food-guessing-game/usa/clam-chowder/clam_chowder_3.jpg.jpg',
  ],
  'Grilled Cheese Sandwich': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349847/food-guessing-game/usa/grilled-cheese-sandwich/grilled_cheese_sandwich_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349853/food-guessing-game/usa/grilled-cheese-sandwich/grilled_cheese_sandwich_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349856/food-guessing-game/usa/grilled-cheese-sandwich/grilled_cheese_sandwich_3.jpg.jpg',
  ],
  'Hamburger': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349988/food-guessing-game/usa/hamburger/hamburger_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349994/food-guessing-game/usa/hamburger/hamburger_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349998/food-guessing-game/usa/hamburger/hamburger_3.jpg.jpg',
  ],
  'Key Lime Pie': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349769/food-guessing-game/usa/key-lime-pie/key_lime_pie_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349775/food-guessing-game/usa/key-lime-pie/key_lime_pie_2.jpg.jpg',
  ],
  'Meatloaf': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349880/food-guessing-game/usa/meatloaf/meatloaf_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349891/food-guessing-game/usa/meatloaf/meatloaf_2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349895/food-guessing-game/usa/meatloaf/meatloaf_3.jpg.jpg',
  ],
  'Philly Cheesesteak': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349810/food-guessing-game/usa/philly-cheesesteak/philly_cheesesteak_1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349815/food-guessing-game/usa/philly-cheesesteak/philly_cheesesteak_2.jpg.jpg',
  ],
  'Rocky Mountain Oysters': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349963/food-guessing-game/usa/rocky-mountain-oysters/rocky_mountain_oysters_1.jpg.jpg',
  ],
  'B Nh M ': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349358/food-guessing-game/vietnam/b%C3%A1nh-m%C3%AC/b_nh_m__1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349364/food-guessing-game/vietnam/b%C3%A1nh-m%C3%AC/b_nh_m__2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349368/food-guessing-game/vietnam/b%C3%A1nh-m%C3%AC/b_nh_m__3.jpg.jpg',
  ],
  'Ph ': [
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349381/food-guessing-game/vietnam/ph%E1%BB%9F/ph__1.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349387/food-guessing-game/vietnam/ph%E1%BB%9F/ph__2.jpg.jpg',
    'https://res.cloudinary.com/dwav84wrk/image/upload/v1759349391/food-guessing-game/vietnam/ph%E1%BB%9F/ph__3.jpg.jpg',
  ],
};

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'foods.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const foodsData = JSON.parse(fileContents);
    
    // Transform data: use ONLY Cloudinary images, filter to only dishes with Cloudinary images
    const transformedData = foodsData
      .map((food: any) => {
        // Check if we have Cloudinary images for this dish
        const cloudinaryImgs = cloudinaryImages[food.name];
        
        return {
          ...food,
          images: cloudinaryImgs || [] // Only Cloudinary images, no fallback
        };
      })
      .filter((food: any) => food.images && food.images.length > 0); // Only dishes with Cloudinary images
    
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('Error loading foods data:', error);
    return NextResponse.json({ error: 'Failed to load foods data' }, { status: 500 });
  }
}
