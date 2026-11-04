-- =====================================================================
-- Polycards: dictionary word details, nouns (batch 4 of 8), 334 words
-- Run AFTER polycards-word-details.sql. Only fills empty columns, so it is safe to run twice
-- and never overwrites a word fixed by hand. Readable list: the .csv file with the same name.
-- Made by: node scripts/wordDetails.mjs nouns 4
-- =====================================================================
update public.words as w
set countable = v.countable, plural = v.plural
from (values
  ('63c9eb63-4676-4d17-84a7-e6e775af4831'::uuid, 'countable', 'hills'),  -- hill
  ('8b641550-1a0e-4218-abcd-f730a4d9661f'::uuid, 'countable', 'hips'),  -- hip
  ('e35e760a-ec00-4a3f-afdc-6f8ec5386bf7'::uuid, 'uncountable', null),  -- hip hop
  ('744852df-520f-4351-84a5-4af4925ce1da'::uuid, 'countable', 'historians'),  -- historian
  ('49c8cd60-8b49-4a2b-bd75-8d49349029a4'::uuid, 'both', 'histories'),  -- history
  ('9638245a-66bf-4777-8e3c-b1fa5cbf8489'::uuid, 'countable', 'hobbies'),  -- hobby
  ('76c23b2a-273a-4e28-8d0e-1db2a68560bd'::uuid, 'uncountable', null),  -- hockey
  ('faeb7cf3-e649-4f2d-9e8e-83bb4ccf79fd'::uuid, 'countable', 'holes'),  -- hole
  ('412e64c1-96e9-4eac-bdd3-19e125693a94'::uuid, 'countable', 'holidays'),  -- holiday
  ('bd512f1a-59d3-462c-b901-e505d87384bd'::uuid, 'countable', 'homes'),  -- home
  ('c8b29254-1703-4282-968a-1b58baaa4985'::uuid, 'uncountable', null),  -- home economics
  ('4abe93bc-9eb7-49f9-9063-2f293aa98a4b'::uuid, 'countable', 'homestays'),  -- homestay
  ('ad08d9bc-ecab-4ccc-9b98-66d8c36fec79'::uuid, 'countable', 'hometowns'),  -- hometown
  ('b8ecd1c0-5d8a-4e6b-98f7-8f21c82e47a4'::uuid, 'uncountable', null),  -- homework
  ('568c479c-429e-4d1d-9245-e31e25b4255a'::uuid, 'uncountable', null),  -- honesty
  ('04cd19ff-e605-4e2c-8c33-228b4b00771a'::uuid, 'uncountable', null),  -- honey
  ('b784f1cc-a1de-4e59-9b7b-692dac75c455'::uuid, 'countable', 'honeymoons'),  -- honeymoon
  ('822ab66c-b808-4fe2-8e1e-8be125e2ad56'::uuid, 'both', 'honors'),  -- honor
  ('97ed7513-f593-4202-b8f7-af326913336f'::uuid, 'countable', 'horizons'),  -- horizon
  ('c5e6c567-fde8-418d-9042-3290cc737954'::uuid, 'countable', 'horns'),  -- horn
  ('24716235-d0dc-4098-8b18-c8efb194e6a3'::uuid, 'both', 'horrors'),  -- horror
  ('7ffe2f1a-faca-425e-a0c8-9b8239f68fc3'::uuid, 'countable', 'horses'),  -- horse
  ('6b6b8dcf-0158-42dd-8fc1-57b6742514bd'::uuid, 'countable', 'hospitals'),  -- hospital
  ('8b707495-51fa-4e95-aa11-12e9423702a6'::uuid, 'countable', 'hosts'),  -- host
  ('0aec9adc-3e6c-405e-98d1-3676cebe0816'::uuid, 'countable', 'hostels'),  -- hostel
  ('74725f1f-e35a-4337-b947-196d9fe0aa68'::uuid, 'countable', 'hot dogs'),  -- hot dog
  ('853b0652-1d92-4756-97ca-6ea1c3815519'::uuid, 'countable', 'hot springs'),  -- hot spring
  ('f25d7324-0990-48f0-8302-a83b34a6cdb2'::uuid, 'countable', 'hotels'),  -- hotel
  ('f1c7569e-816f-4896-aa4c-98d4ec7f8469'::uuid, 'countable', 'hours'),  -- hour
  ('fcd8bd63-97fe-4a24-8850-82276e4f9ff0'::uuid, 'countable', 'houses'),  -- house
  ('cd45e44d-0b5e-4fd3-ae5c-306d97691fd5'::uuid, 'countable', 'households'),  -- household
  ('fa4c2f99-e178-4b79-b169-134dbf347953'::uuid, 'uncountable', null),  -- housework
  ('46c25ffa-344b-4902-aa93-53ad3078da26'::uuid, 'countable', 'humans'),  -- human
  ('1b5cbb8d-8b4c-4c27-a541-86d7e9cba2f3'::uuid, 'countable', 'human beings'),  -- human being
  ('59dc461d-9b99-47fe-83d8-9365765a17d5'::uuid, 'plural', null),  -- human rights
  ('99cb6724-3995-4800-aa38-d634aeec31e9'::uuid, 'uncountable', null),  -- humanity
  ('41fdeaf6-2d4d-43cc-a0e5-19fb5c2abecf'::uuid, 'uncountable', null),  -- humor
  ('5078f897-5e7a-4eee-bcfa-7059c312a445'::uuid, 'uncountable', null),  -- hunger
  ('92d18b55-288a-44e4-8e26-702b93c9bfe4'::uuid, 'countable', 'hunters'),  -- hunter
  ('2dd66629-fe52-46d2-a4a5-c0b34a268bd2'::uuid, 'uncountable', null),  -- hunting
  ('254c0af6-37a1-4792-97bb-f6f21642826e'::uuid, 'countable', 'husbands'),  -- husband
  ('d3be45c4-0cee-4ad9-815c-0123c7993424'::uuid, 'countable', 'huts'),  -- hut
  ('a4988920-4d76-477e-8b6b-9b20f0601f56'::uuid, 'uncountable', null),  -- ice
  ('c0229550-dc67-4ad0-9398-0ceb46dda0a4'::uuid, 'both', 'ice creams'),  -- ice cream
  ('7709dbf7-3d26-4de6-829f-9fa6461bcbd4'::uuid, 'uncountable', null),  -- ice hockey
  ('dadfc1e6-019f-4070-80fc-89c4bf953269'::uuid, 'uncountable', null),  -- ice skating
  ('3825c26b-1a2b-48ce-ace1-b7dcafa12040'::uuid, 'countable', 'ideas'),  -- idea
  ('8d3eb232-e771-432a-81f6-f33c2fea8e3f'::uuid, 'countable', 'identities'),  -- identity
  ('1ae459a2-52f1-4ba2-8611-7aa3c1b62b1b'::uuid, 'countable', 'identity cards'),  -- identity card
  ('aa70d0b5-b5f9-49a5-bba2-169ff8921da3'::uuid, 'countable', 'idioms'),  -- idiom
  ('117e642a-9487-485d-a256-8c01db02c1ac'::uuid, 'countable', 'idols'),  -- idol
  ('690ccec9-824c-425f-a08d-dbc9ea64c5f4'::uuid, 'countable', 'illnesses'),  -- illness
  ('eeb38d80-7006-4603-91bf-faf3ae3d8194'::uuid, 'countable', 'illustrations'),  -- illustration
  ('095454d6-6fa9-4267-a2c8-3d9de45818b2'::uuid, 'countable', 'images'),  -- image
  ('3722571b-a152-4707-8e0d-4e95456ee058'::uuid, 'both', 'imaginations'),  -- imagination
  ('43f63159-7e33-478f-9ca2-b594005f0698'::uuid, 'uncountable', null),  -- immigration
  ('9e39f4c8-faba-43cd-a5fc-5de37952bb49'::uuid, 'countable', 'impacts'),  -- impact
  ('afa3b739-7beb-4c77-86c5-777f4d03d40e'::uuid, 'uncountable', null),  -- importance
  ('f202a7f7-af3f-4c35-900b-27f18da8c171'::uuid, 'countable', 'impressions'),  -- impression
  ('13ed3d55-5699-4c9d-82d5-128b883249c0'::uuid, 'countable', 'improvements'),  -- improvement
  ('36dd9540-1f37-4763-82d5-39eab45a770a'::uuid, 'countable', 'inches'),  -- inch
  ('7934b1fd-02ba-47bc-bb31-5f69b69c54d4'::uuid, 'countable', 'incidents'),  -- incident
  ('963b1f21-682d-4fa7-8847-c7dc94b03f5c'::uuid, 'countable', 'incomes'),  -- income
  ('35d92308-d3b8-4243-b9fd-9a4a229231e9'::uuid, 'countable', 'indefinite articles'),  -- indefinite article
  ('fa6e57f3-9156-45c8-999a-c83541fc63f9'::uuid, 'uncountable', null),  -- independence
  ('f796a723-cb68-471e-9c47-807e30ff7b85'::uuid, 'both', 'industries'),  -- industry
  ('6fa25adc-043a-4d45-8f72-89f495173d54'::uuid, 'both', 'infections'),  -- infection
  ('a770754b-06ac-4d43-879e-be64f150778c'::uuid, 'countable', 'infinitives'),  -- infinitive
  ('b2060078-3f4b-439c-b388-7f3f082c1772'::uuid, 'both', 'influences'),  -- influence
  ('923b7034-8e52-483b-a4da-4f16e572e365'::uuid, 'uncountable', null),  -- information
  ('6893e732-91b2-425c-9e2b-7aca5b5193c3'::uuid, 'countable', 'ingredients'),  -- ingredient
  ('6536e1a7-1175-45d1-be85-fde418b0cb40'::uuid, 'countable', 'inhabitants'),  -- inhabitant
  ('b1532beb-90c2-49fd-a04a-a101e8d261fa'::uuid, 'countable', 'injuries'),  -- injury
  ('7dbbaba7-26cd-4e9a-96a6-1ecf5d621564'::uuid, 'uncountable', null),  -- ink
  ('7085af71-1714-40fb-a81e-3b208deedd3e'::uuid, 'countable', 'inquiries'),  -- inquiry
  ('0202c6cd-6d4c-47a8-99c3-ef31ef6e07f7'::uuid, 'countable', 'insects'),  -- insect
  ('f320587f-7bf6-4d3e-b4d5-1497803ea2bf'::uuid, 'countable', 'insights'),  -- insight
  ('644028f2-341d-49ac-81bb-d1b4ce20fc99'::uuid, 'countable', 'inspections'),  -- inspection
  ('bbeada3f-b273-4298-b934-81a18e3a40e8'::uuid, 'both', 'inspirations'),  -- inspiration
  ('569b91ba-473d-4b4b-9444-bbfad3c6fdf1'::uuid, 'countable', 'instances'),  -- instance
  ('3983547a-4489-4f74-997f-5e78f4577adf'::uuid, 'countable', 'institutes'),  -- institute
  ('7cb24f12-1902-445a-8aa2-83f43e931102'::uuid, 'countable', 'instructions'),  -- instruction
  ('145da995-6972-41f5-a0f3-76f99626604b'::uuid, 'countable', 'instructors'),  -- instructor
  ('b8ba236a-a166-4391-9e2b-6add99a711f0'::uuid, 'countable', 'instruments'),  -- instrument
  ('d58d5b9a-9cf5-48e4-b567-87b2fa4968b1'::uuid, 'uncountable', null),  -- insurance
  ('f9ccd368-b976-429c-a0ef-9a36cd1b6fd7'::uuid, 'uncountable', null),  -- intelligence
  ('d95e0b88-9b2f-4c37-ac2b-38d28143fad0'::uuid, 'countable', 'intentions'),  -- intention
  ('85fc8488-7ebd-46b0-aab0-352beefe47e3'::uuid, 'countable', 'interactions'),  -- interaction
  ('0441990e-3664-45d6-96df-40a23f5932ba'::uuid, 'both', 'interests'),  -- interest
  ('dd221a2c-500e-4e1b-a067-f1b930d70cc0'::uuid, 'countable', 'intermissions'),  -- intermission
  ('883c9c0c-837b-4509-94cc-3c860c2e6c9b'::uuid, 'uncountable', null),  -- internet
  ('28fe8890-1c3e-46d4-b6a3-c5426afcbf8a'::uuid, 'countable', 'intervals'),  -- interval
  ('f653c791-b93a-4832-82e0-07b40f283ee6'::uuid, 'countable', 'interviews'),  -- interview
  ('e70a63d1-bee6-492a-9d31-6ade02e06719'::uuid, 'countable', 'interviewers'),  -- interviewer
  ('a2ab9081-17e9-465d-b27c-58c671ffecde'::uuid, 'countable', 'introductions'),  -- introduction
  ('b1316cfc-418a-49a2-8fab-5c82fc8b5519'::uuid, 'countable', 'invasions'),  -- invasion
  ('3897f562-6f79-4d5c-aaa4-4770d01452cd'::uuid, 'countable', 'inventions'),  -- invention
  ('46bdd798-9421-4151-b536-14cec80a201d'::uuid, 'countable', 'inventors'),  -- inventor
  ('627dee0e-7197-4129-ae4d-7d498c42fe92'::uuid, 'countable', 'investigations'),  -- investigation
  ('4b667750-0bc2-4207-a3c1-bc69e2de343c'::uuid, 'countable', 'invitations'),  -- invitation
  ('01362056-2680-4053-8777-7c31352c2788'::uuid, 'both', 'irons'),  -- iron
  ('39480e42-4fd0-4c0d-8241-efcf6b17aed9'::uuid, 'countable', 'islands'),  -- island
  ('a3290294-7c78-4414-9ea0-c0f13c8aeea1'::uuid, 'countable', 'isles'),  -- isle
  ('025fbc93-136c-46c6-8adf-4e2e5f01b1cf'::uuid, 'uncountable', null),  -- isolation
  ('596cfd61-c6f6-4ccd-8c1c-6a609efdd7c8'::uuid, 'countable', 'issues'),  -- issue
  ('cea5acf9-64ac-4534-8a50-340545346033'::uuid, 'countable', 'items'),  -- item
  ('8ff49d61-0348-4a55-90f9-11b59086f81d'::uuid, 'uncountable', null),  -- ivory
  ('3e094319-49e4-44bd-ae6d-084a0dcec45f'::uuid, 'countable', 'jackets'),  -- jacket
  ('60db49d1-939a-44ee-b7f3-70238bbf5d4b'::uuid, 'countable', 'jails'),  -- jail
  ('f1914bf0-73ca-4679-b6ca-720d25077cdb'::uuid, 'both', 'jams'),  -- jam
  ('2d38604b-d0cf-4360-b6fa-c5ebb828ea06'::uuid, 'countable', 'jars'),  -- jar
  ('922ff0ce-112a-4587-bb06-d13b1908d348'::uuid, 'uncountable', null),  -- jazz
  ('38026675-5dad-483e-b3b8-467c975b369d'::uuid, 'plural', null),  -- jeans
  ('876ce248-aa7e-4d71-8794-9f66869f082d'::uuid, 'both', 'jellies'),  -- jelly
  ('ff59ca54-aa7f-4e2d-9697-efe573f0ef1a'::uuid, 'countable', 'jewels'),  -- jewel
  ('d858e84a-1531-4bcc-bef5-d182f0af108a'::uuid, 'uncountable', null),  -- jewelry
  ('60133f39-795a-40bb-ba5e-ff663ca824f1'::uuid, 'countable', 'jobs'),  -- job
  ('3c3705c3-3b9e-4d39-850a-a2cc67f6e83b'::uuid, 'uncountable', null),  -- jogging
  ('6fcdb90e-dd90-4f1c-98d0-06d0a4c2b244'::uuid, 'countable', 'jokes'),  -- joke
  ('81f8be8a-d62a-40fc-b25c-305d82fb43d8'::uuid, 'countable', 'journals'),  -- journal
  ('8d293cb1-024c-4521-b645-e80174e18a4c'::uuid, 'countable', 'journalists'),  -- journalist
  ('00f505a0-507c-4086-9ed4-b60ea56de3b0'::uuid, 'countable', 'journeys'),  -- journey
  ('8eccb9d8-4e00-43eb-bc4c-6b2874410ac3'::uuid, 'both', 'joys'),  -- joy
  ('8aaad148-93ff-43b7-9520-9f353e66f26f'::uuid, 'countable', 'judges'),  -- judge
  ('ca1d2d5b-dc71-4b10-a3f6-31bb8d41446a'::uuid, 'both', 'judgments'),  -- judgment
  ('96858419-a6a6-4d21-9b9a-1a16c72bf862'::uuid, 'uncountable', null),  -- judo
  ('76950fe7-f205-4394-8c94-b5058635565d'::uuid, 'both', 'juices'),  -- juice
  ('0810d8ab-5b41-48ed-b381-897725dd6e5d'::uuid, 'both', 'jump ropes'),  -- jump rope
  ('bb1d9b05-91e2-4d8e-bfe3-cd81e6319aad'::uuid, 'countable', 'jungles'),  -- jungle
  ('ad9aae14-be5b-49ef-8122-943313df7a71'::uuid, 'countable', 'junior high schools'),  -- junior high school
  ('31a6e1d0-1225-4de7-b603-1dce54e7c39c'::uuid, 'uncountable', null),  -- justice
  ('2d59e8fa-a4b6-4251-b2dc-cb410a5e6a01'::uuid, 'countable', 'juveniles'),  -- juvenile
  ('e7bad98c-360d-4dfb-8eb4-da391a800067'::uuid, 'countable', 'kangaroos'),  -- kangaroo
  ('7c2ecfce-7e1b-4a82-8d33-2896e0834e18'::uuid, 'uncountable', null),  -- karate
  ('af5213d6-f64d-4e81-9d1b-63e2b59d44b9'::uuid, 'uncountable', null),  -- kendo
  ('b2093f0d-97dd-4637-851e-b50f07b6bf7c'::uuid, 'countable', 'kettles'),  -- kettle
  ('0f055c89-a25f-4249-9c98-0206c655a944'::uuid, 'countable', 'keys'),  -- key
  ('ff4e73f9-14fc-417c-a5cf-e17d4eb98716'::uuid, 'countable', 'keyboards'),  -- keyboard
  ('bf7173ad-54f4-4118-a2c3-c9a5eea48e30'::uuid, 'countable', 'kids'),  -- kid
  ('c3c761e2-735a-4bc5-8133-aa87ed96be35'::uuid, 'countable', 'killer whales'),  -- killer whale
  ('025194a3-1a6d-414a-9e02-2f037318f3fd'::uuid, 'countable', 'kilograms'),  -- kilogram
  ('9e826bed-01e3-4368-8748-0207598624c4'::uuid, 'countable', 'kilometers'),  -- kilometer
  ('7d8786c6-fda1-45db-ac20-5a9ffa5e1fa7'::uuid, 'countable', 'kinds'),  -- kind
  ('f384c041-8cff-4db2-9281-ddb5f78279bf'::uuid, 'uncountable', null),  -- kindness
  ('65ca0224-8a09-4733-8a36-28d98017d1a5'::uuid, 'countable', 'kings'),  -- king
  ('c60b4209-7626-45b0-8dec-8b395c9acdd9'::uuid, 'countable', 'kingdoms'),  -- kingdom
  ('b923aeb9-077d-4815-bbec-9a5826d532a6'::uuid, 'countable', 'kits'),  -- kit
  ('39ac9c69-7ffb-4d02-8581-23833934f4ab'::uuid, 'countable', 'kitchens'),  -- kitchen
  ('85782b57-ffd0-430d-ac4a-09290eef57dd'::uuid, 'countable', 'kites'),  -- kite
  ('32abd99a-4135-490a-98cf-b4160d516ef1'::uuid, 'countable', 'kittens'),  -- kitten
  ('777fa606-292b-4d81-9643-53150467be7d'::uuid, 'countable', 'kiwis'),  -- kiwi
  ('8d29daa9-7728-4ad7-a4d1-4b50280c0d0b'::uuid, 'countable', 'knees'),  -- knee
  ('63ee0506-e795-408e-9233-e58ed2c5ddf9'::uuid, 'countable', 'knives'),  -- knife
  ('9723a370-4c53-4d2e-aa3a-b77e74b2bba9'::uuid, 'uncountable', null),  -- knowledge
  ('1335793a-a7b8-47f8-a28a-0f40b5e59648'::uuid, 'countable', 'koalas'),  -- koala
  ('bb3e24e0-85a0-4cfb-bde4-f76e45bfb7b0'::uuid, 'uncountable', null),  -- labor
  ('cd6f4e79-f3c5-44f0-a553-d57596d1fb00'::uuid, 'countable', 'laboratories'),  -- laboratory
  ('708db079-2520-452a-8d74-bc6383b1b2ef'::uuid, 'uncountable', null),  -- lack
  ('c3c70f1d-0356-48e6-917a-3a32d539270f'::uuid, 'countable', 'ladders'),  -- ladder
  ('f85d0d96-2171-443c-b17b-bc5c77227549'::uuid, 'countable', 'ladies'),  -- lady
  ('e6456a03-5e5c-42b5-bb92-86e69e990754'::uuid, 'countable', 'lakes'),  -- lake
  ('581a0830-4f8e-4a73-a3d1-848b1877374e'::uuid, 'both', 'lambs'),  -- lamb
  ('80b85d25-3ece-4f0d-acf2-e2f67b7d3559'::uuid, 'countable', 'lamps'),  -- lamp
  ('409ac1fa-6747-4904-b9b9-91981ae55efa'::uuid, 'both', 'lands'),  -- land
  ('5aa123df-ea62-467d-8b12-1c473da143cf'::uuid, 'countable', 'landlords'),  -- landlord
  ('21299dd2-b12b-42ee-9ab1-8238b4ca1bc8'::uuid, 'countable', 'landscapes'),  -- landscape
  ('1328391f-5c96-49df-8d7a-0159414d1665'::uuid, 'countable', 'lanes'),  -- lane
  ('2dabb755-b49f-4e63-abf2-169331a932fd'::uuid, 'countable', 'languages'),  -- language
  ('9af990af-5922-444a-93ae-ecfa6184729d'::uuid, 'countable', 'last names'),  -- last name
  ('8aa0584e-496f-41ea-9169-49e7d8762f68'::uuid, 'uncountable', null),  -- laughter
  ('ba468e4c-a471-47f8-a07b-fc1a5b6ab63d'::uuid, 'countable', 'laws'),  -- law
  ('b2b6c136-a054-40c1-b8db-63c99d6032fb'::uuid, 'countable', 'lawyers'),  -- lawyer
  ('70c6bb31-ebae-4b9d-aaf8-1fbb6725dd1a'::uuid, 'countable', 'layers'),  -- layer
  ('9e8fb3f9-afa7-4a1b-96e3-404116316ffd'::uuid, 'countable', 'leaders'),  -- leader
  ('6344cb7d-3263-4f56-beba-e92b66c1a252'::uuid, 'uncountable', null),  -- leadership
  ('aec83518-119c-4b5f-863f-83c337748ff7'::uuid, 'countable', 'leaves'),  -- leaf
  ('321f46e3-cfa4-42f8-a0c9-8bd78df5b911'::uuid, 'countable', 'leagues'),  -- league
  ('50595d12-4806-49e8-adc3-cbbfb09e09b9'::uuid, 'countable', 'learners'),  -- learner
  ('d7004eba-9bd6-420b-954b-b9709fbc1609'::uuid, 'uncountable', null),  -- leather
  ('7c7364aa-00ca-4cf2-bee5-a3fc82dd5401'::uuid, 'countable', 'lectures'),  -- lecture
  ('d454449f-f6bd-4cb3-8d16-b4c512c67c74'::uuid, 'countable', 'legs'),  -- leg
  ('860fa8b7-741d-4b33-a0cd-5ad06e408a01'::uuid, 'countable', 'legacies'),  -- legacy
  ('94fc98f7-8fbd-488e-a867-fa8a111fbee1'::uuid, 'uncountable', null),  -- leisure
  ('34cbebdd-a499-4671-b55f-81e181851d5d'::uuid, 'countable', 'lemons'),  -- lemon
  ('61882535-e4c2-4865-9f4e-4ecb5e1ee886'::uuid, 'uncountable', null),  -- lemonade
  ('754eb84a-65b5-4a2f-9d72-43919cad1951'::uuid, 'countable', 'lengths'),  -- length
  ('7a1d1f09-9199-4489-bdef-5793c574fa3e'::uuid, 'countable', 'lessons'),  -- lesson
  ('8fcd0427-4142-41a2-b16f-1f250ae7e1f3'::uuid, 'countable', 'letters'),  -- letter
  ('6016e6d8-5016-48b6-b33a-138e14e0fbd2'::uuid, 'countable', 'lettuces'),  -- lettuce
  ('5cee9c8e-f9a0-49f9-8696-d474f3cfb15a'::uuid, 'countable', 'levels'),  -- level
  ('dc1984a1-8631-469a-a6b4-a3835ed01d7f'::uuid, 'countable', 'liars'),  -- liar
  ('49729519-7bbd-49ed-bda6-270dbe219ee0'::uuid, 'countable', 'liberations'),  -- liberation
  ('1ad755f2-3ea9-4594-8f7b-27fbd0fdd770'::uuid, 'countable', 'librarians'),  -- librarian
  ('eda02163-71e4-4352-b88e-e0885f523bb2'::uuid, 'countable', 'libraries'),  -- library
  ('0e657f6c-7802-44fe-a0fa-390b816a6400'::uuid, 'countable', 'licenses'),  -- license
  ('91f3e303-44b5-4817-be72-a0c6cd44ba52'::uuid, 'countable', 'lies'),  -- lie
  ('f87e0da5-0a17-4213-9326-256e1d5a0893'::uuid, 'both', 'lives'),  -- life
  ('aaebdde7-729a-4ff9-b0c2-7f52c5423e5c'::uuid, 'countable', 'lifeguards'),  -- lifeguard
  ('03767a9e-62f6-48f8-8121-2d99c7c41c38'::uuid, 'countable', 'lifestyles'),  -- lifestyle
  ('7bd5c1b7-29d4-4cb1-92aa-5ea930c90e75'::uuid, 'both', 'lights'),  -- light
  ('c8ee80d3-9c4f-4e22-b015-0ea401a1ae94'::uuid, 'countable', 'lighters'),  -- lighter
  ('e2631b48-db0e-4478-af07-cb8a24eda43a'::uuid, 'uncountable', null),  -- lightning
  ('1534a03c-a853-45bd-86af-c85e6a2ce8dd'::uuid, 'countable', 'limits'),  -- limit
  ('6f9e6193-393d-428f-b5cf-b2c5279e66d9'::uuid, 'countable', 'limitations'),  -- limitation
  ('f82e42ab-914a-44c2-b038-68430fa4e582'::uuid, 'countable', 'lines'),  -- line
  ('41db81df-c1a1-496d-8687-83d92dad2471'::uuid, 'countable', 'lions'),  -- lion
  ('b4053d60-0c84-4d47-8d0f-970f91e46bef'::uuid, 'countable', 'lips'),  -- lip
  ('0c7f0449-55b6-43f8-a5d3-44c0ff3becf3'::uuid, 'countable', 'liquids'),  -- liquid
  ('ab302fa4-5ab4-4459-8d54-f45d55325e08'::uuid, 'countable', 'lists'),  -- list
  ('0e08e514-6196-4eb8-aa6a-0f54dd46860d'::uuid, 'countable', 'liters'),  -- liter
  ('81bd0ce3-32f6-41f5-a84a-d8f5b82194c0'::uuid, 'uncountable', null),  -- literature
  ('8cd7abce-7a46-4892-b02c-f72435d93097'::uuid, 'countable', 'livers'),  -- liver
  ('9bb1e81e-18a4-4686-8720-2382ba5d8a37'::uuid, 'countable', 'living rooms'),  -- living room
  ('7cea6d60-37ea-42fe-88e2-8b3ef4243b75'::uuid, 'countable', 'loaves'),  -- loaf
  ('d2efcb9c-cc5d-46d0-b686-f8cf37f89d7e'::uuid, 'countable', 'locations'),  -- location
  ('2ff23421-91f5-4ce3-9b62-5a34249dc5ef'::uuid, 'countable', 'locks'),  -- lock
  ('8f3ebd40-cff1-456a-ac14-ac4fadbc82f9'::uuid, 'countable', 'lodges'),  -- lodge
  ('dd8aaa22-99be-4bfb-a95e-6e087ff3780d'::uuid, 'countable', 'logs'),  -- log
  ('451f7f7b-d03f-4c1f-966e-a8030758fec6'::uuid, 'uncountable', null),  -- logging
  ('d732b091-15b6-48e9-834e-ac3063ce2af6'::uuid, 'uncountable', null),  -- logic
  ('484bc386-4fce-478c-b7e8-28de8a7dd077'::uuid, 'countable', 'logos'),  -- logo
  ('0dd7003b-ed42-4b1b-bc4a-72e43f72e089'::uuid, 'countable', 'losses'),  -- loss
  ('e893f747-4d4c-42f3-bcf5-9a9858d36e32'::uuid, 'countable', 'lotteries'),  -- lottery
  ('79fb2917-3c8c-4ece-9587-54fdaa735804'::uuid, 'countable', 'loudspeakers'),  -- loudspeaker
  ('bf532e9f-246d-4e14-a066-342efec4e9e4'::uuid, 'uncountable', null),  -- love
  ('d16f0fd0-a0e2-4d3d-a628-c4f218f05a4c'::uuid, 'countable', 'lovers'),  -- lover
  ('f283f2d0-44d8-4c3a-ab05-147257e17acb'::uuid, 'countable', 'loyalties'),  -- loyalty
  ('000dab5b-6973-4d26-af94-3538fdbce0ae'::uuid, 'uncountable', null),  -- luck
  ('8901c813-b1ea-4563-b32c-27b7d7c05b6b'::uuid, 'countable', 'lullabies'),  -- lullaby
  ('bb45b71a-ea2b-4a5c-8856-fa8430cf3e21'::uuid, 'both', 'lunches'),  -- lunch
  ('5e0b4cd4-c745-472a-9d41-fd46771f1e9c'::uuid, 'countable', 'lunchtimes'),  -- lunchtime
  ('f03c4a08-583f-453c-b6b7-ed5eb11c760a'::uuid, 'countable', 'lungs'),  -- lung
  ('46a1561b-62d2-4443-ab02-327dd493371b'::uuid, 'both', 'luxuries'),  -- luxury
  ('6db5ecfc-6c8c-4ebc-ba7c-3f2bb7939310'::uuid, 'plural', null),  -- lyrics
  ('e8fab778-d294-4287-b551-1e2ad02855af'::uuid, 'countable', 'machines'),  -- machine
  ('33e3475e-84a2-4502-a754-1a9002caf3ea'::uuid, 'countable', 'magazines'),  -- magazine
  ('be97fed0-95eb-4b27-8193-1927927ba55f'::uuid, 'uncountable', null),  -- magic
  ('6f24d09c-a94f-43c1-a090-6aa9f34afbae'::uuid, 'countable', 'magicians'),  -- magician
  ('6569278c-54b5-4f33-a5f7-9380cac9240c'::uuid, 'uncountable', null),  -- mail
  ('ae137b9e-018d-4710-a1e3-c74dc40ad5f5'::uuid, 'countable', 'mailboxes'),  -- mailbox
  ('d9e17634-60a7-4cd7-8c47-6e89c27e25b5'::uuid, 'countable', 'main courses'),  -- main course
  ('1d0b90ea-6443-490c-8376-728a61ca28c6'::uuid, 'uncountable', null),  -- maintenance
  ('be133ccc-708c-4916-b56e-20b3b1142b09'::uuid, 'countable', 'majorities'),  -- majority
  ('e30b7ed2-9b04-40dd-8b19-6706bf716423'::uuid, 'countable', 'makers'),  -- maker
  ('d12e896d-ae4a-4c40-abea-6e1fc90fe49f'::uuid, 'uncountable', null),  -- makeup
  ('1d9e2745-2814-4adf-aa15-9c8f0fff8d7e'::uuid, 'countable', 'malls'),  -- mall
  ('2de1f89a-f442-47e0-a9ec-aff792eaad34'::uuid, 'countable', 'men'),  -- man
  ('afc9b87d-d496-4f0e-af74-ef8b0377445c'::uuid, 'uncountable', null),  -- management
  ('77f1307a-4ac4-4a13-86ad-a68fe83b41d7'::uuid, 'countable', 'managers'),  -- manager
  ('e2c63ca0-ef33-44b2-a97e-8e415699ef52'::uuid, 'uncountable', null),  -- mankind
  ('f94ba7fa-85ab-43a8-9017-1bda9def6227'::uuid, 'plural', null),  -- manners
  ('84734399-f33f-4e04-8bf2-417dae7badf2'::uuid, 'countable', 'manufacturers'),  -- manufacturer
  ('2f53d080-53bb-412f-a927-fdcf503ea76a'::uuid, 'countable', 'maps'),  -- map
  ('de5ac43c-a253-4fcc-afbb-b0aba689455e'::uuid, 'countable', 'maples'),  -- maple
  ('6607d446-3a30-4051-97e3-9111f7891b85'::uuid, 'both', 'marbles'),  -- marble
  ('109fbac6-5286-4cb4-85ec-bc9f39557d32'::uuid, 'countable', 'marches'),  -- march
  ('f1881352-ff79-4dc6-b482-3d601558d1f8'::uuid, 'countable', 'marks'),  -- mark
  ('b414923f-7a82-447d-8984-de71e1897f62'::uuid, 'countable', 'markers'),  -- marker
  ('0c6292ef-bdeb-43db-893e-e504149c84d8'::uuid, 'countable', 'markets'),  -- market
  ('e974141c-ec26-445a-a4f5-28de3dc17316'::uuid, 'both', 'marriages'),  -- marriage
  ('c1a716ac-1d3a-47e5-9748-d4df8436a929'::uuid, 'plural', null),  -- martial arts
  ('e4e38843-fdfc-45e3-be3a-55b33067f87e'::uuid, 'countable', 'matches'),  -- match
  ('2c93e919-d272-44a4-9c7c-b4d6aafdc5c7'::uuid, 'countable', 'materials'),  -- material
  ('d6341b7a-7bd9-4cab-826c-b73878644873'::uuid, 'uncountable', null),  -- math
  ('53c9b055-e222-4939-835f-51b7fcb332f0'::uuid, 'countable', 'mathematicians'),  -- mathematician
  ('63a4e948-76e7-4cd3-9bfa-a89e7f59373f'::uuid, 'uncountable', null),  -- mathematics
  ('416121af-bba2-43c1-a126-ddd191b99b4b'::uuid, 'countable', 'matters'),  -- matter
  ('0cc3187e-0a58-45a9-9795-53f5ad27e5b1'::uuid, 'countable', 'maximums'),  -- maximum
  ('57499d11-860c-48da-bef2-cc0acce0ef97'::uuid, 'countable', 'mayors'),  -- mayor
  ('4e2fa0f7-a03a-445a-ab40-1ff2a24a59b5'::uuid, 'countable', 'meals'),  -- meal
  ('218a9cf3-d9e8-41c9-a001-01ce55022521'::uuid, 'countable', 'meanings'),  -- meaning
  ('698b7e39-deb4-4a5e-90ca-606c08676d55'::uuid, 'countable', 'measures'),  -- measure
  ('cf74df9a-2b06-48d1-8eaa-e5709f5a76a0'::uuid, 'countable', 'measurements'),  -- measurement
  ('b71d2155-49b5-479f-b019-5118e44afe81'::uuid, 'both', 'meats'),  -- meat
  ('701c3b03-5825-4b47-87ec-61dabee03232'::uuid, 'countable', 'mechanics'),  -- mechanic
  ('796945a9-2fdb-46a2-bca8-c2293518cf26'::uuid, 'countable', 'medals'),  -- medal
  ('6b41cc61-c314-409a-a7f4-5e442c98add4'::uuid, 'both', 'medicines'),  -- medicine
  ('c6e5f55c-f3a3-4d56-8150-9ab4daca4301'::uuid, 'uncountable', null),  -- meditation
  ('82bcd9b4-a631-40f9-9a68-7cf739d91222'::uuid, 'countable', 'meetings'),  -- meeting
  ('90e29757-5397-4248-b680-3e067fa6fce4'::uuid, 'countable', 'melons'),  -- melon
  ('389ab33e-17c3-43c7-9738-89ccd9ef26e5'::uuid, 'countable', 'members'),  -- member
  ('86d9c7bf-134b-47b5-a56b-8a2530fe5994'::uuid, 'both', 'memberships'),  -- membership
  ('d30f04e5-d035-435b-8bdb-fbfb2ac281bc'::uuid, 'countable', 'memories'),  -- memory
  ('14c35f81-9452-41a4-95ff-2c4d11a399e3'::uuid, 'countable', 'menus'),  -- menu
  ('ea73a975-341e-431c-98c6-2f41e09f0e8f'::uuid, 'countable', 'merchants'),  -- merchant
  ('be693455-950c-4cdc-8bf4-b7029090044c'::uuid, 'countable', 'messes'),  -- mess
  ('0eda49b8-7b91-4dcb-80b3-95455823b12e'::uuid, 'countable', 'messages'),  -- message
  ('5d8f5c7e-9b65-47f4-a86e-b48e561cfae2'::uuid, 'countable', 'message boards'),  -- message board
  ('ad92cdff-2825-463c-a2b6-66bb8209a331'::uuid, 'countable', 'metals'),  -- metal
  ('ef9219b0-e168-48cb-8d89-329daca5a1de'::uuid, 'countable', 'meters'),  -- meter
  ('3335d5d8-d544-4c76-8072-15570d307ce8'::uuid, 'countable', 'methods'),  -- method
  ('c1e33fee-1f8c-4623-8a90-3d7552a8f30c'::uuid, 'uncountable', null),  -- midnight
  ('83bd9e8d-3260-4e92-9e33-ed0a6e8a93e3'::uuid, 'countable', 'miles'),  -- mile
  ('d816d2b4-1f37-4950-924b-16a0648890e1'::uuid, 'uncountable', null),  -- milk
  ('7ec75e53-9810-4bab-a88d-ced15ea854ce'::uuid, 'countable', 'minds'),  -- mind
  ('bfe5ef00-1f87-4c65-884f-3893ccb9da8a'::uuid, 'countable', 'minerals'),  -- mineral
  ('56b5a31e-d5f3-4aa4-bb7a-23cff2050f5f'::uuid, 'uncountable', null),  -- mineral water
  ('6e1a6615-464d-49f0-a29b-8a5b6ae0c5e8'::uuid, 'countable', 'mini debates'),  -- mini debate
  ('34e6a458-c5fb-404e-9bd0-5271dfa8c3bc'::uuid, 'countable', 'minimums'),  -- minimum
  ('bc03fce0-215f-49f6-9584-681e3d1eddfb'::uuid, 'countable', 'minorities'),  -- minority
  ('b84fc39e-08d0-486d-b3e5-972987ac5ae2'::uuid, 'countable', 'minutes'),  -- minute
  ('d48eb01a-c19a-47db-a7ad-ad6b8402b4cc'::uuid, 'countable', 'miracles'),  -- miracle
  ('2a8ae588-410c-4a69-9c72-e4294eeea583'::uuid, 'countable', 'mirrors'),  -- mirror
  ('80a8d894-4606-4a12-8667-a5031ee368b0'::uuid, 'uncountable', null),  -- mischief
  ('44f4fa15-990e-4022-9502-1eb87d1fda19'::uuid, 'uncountable', null),  -- misery
  ('9283cb8b-6edb-41a8-9800-6d64958dbd77'::uuid, 'countable', 'missions'),  -- mission
  ('46e3c250-bd64-43c2-9d51-82a224e2527e'::uuid, 'countable', 'mistakes'),  -- mistake
  ('8f05eca6-91db-4191-a4cd-1947f0070d0e'::uuid, 'countable', 'misunderstandings'),  -- misunderstanding
  ('38136643-56bd-48bd-84e1-29e47503280a'::uuid, 'countable', 'mixing bowls'),  -- mixing bowl
  ('046dbd38-e4c0-49b2-8af3-89cc15eaa3d8'::uuid, 'countable', 'mobiles'),  -- mobile
  ('e8e73051-862a-41a0-af74-6872e5b7b501'::uuid, 'countable', 'modal verbs'),  -- modal verb
  ('df256028-b5fa-4b66-b87f-1635e03a454c'::uuid, 'countable', 'models'),  -- model
  ('196f683a-80a3-4e7b-b574-105d396a0b1c'::uuid, 'uncountable', null),  -- moisture
  ('db15f906-cf67-430b-8a81-3e39b522ddc3'::uuid, 'countable', 'molecules'),  -- molecule
  ('f9765908-1dfb-4877-8d00-5063583e6b64'::uuid, 'countable', 'moms'),  -- mom
  ('a8a53db3-6af2-4c30-a20b-97a537d6bc06'::uuid, 'countable', 'moments'),  -- moment
  ('74ef7ce2-58a7-4ba1-831d-442b8007b379'::uuid, 'countable', 'mommies'),  -- mommy
  ('7990a992-0d55-4299-a4cb-84f715419ac6'::uuid, 'uncountable', null),  -- money
  ('6c480ca7-b0bb-4dd0-ab78-171f15ce1577'::uuid, 'countable', 'monitors'),  -- monitor
  ('d36b67ca-8f46-4e98-95db-1859c39f5399'::uuid, 'countable', 'monks'),  -- monk
  ('adfb1d6d-a7c8-4d6b-bb41-0ed42c897b6a'::uuid, 'countable', 'monkeys'),  -- monkey
  ('1f49c860-be59-453e-9819-18804c938fa7'::uuid, 'countable', 'monsters'),  -- monster
  ('9776a94f-2f8f-42e1-8feb-426c09a102aa'::uuid, 'countable', 'months'),  -- month
  ('4da1aad5-5723-41ea-bd40-2666b0e69452'::uuid, 'countable', 'monuments'),  -- monument
  ('77994fa0-4857-4239-8914-37e128835eed'::uuid, 'countable', 'moods'),  -- mood
  ('da55428c-14dd-4906-b29e-a8069dee3b12'::uuid, 'countable', 'moons'),  -- moon
  ('6c0ff757-c2ef-47b3-bbeb-1c0c6578f921'::uuid, 'countable', 'morals'),  -- moral
  ('e8f44e7d-7deb-428e-933a-a4232f87fa48'::uuid, 'uncountable', null),  -- moral education
  ('634009f4-483d-403d-82a4-459b2614a380'::uuid, 'countable', 'mornings'),  -- morning
  ('d4adaaca-b03c-4a3e-abf6-d35395e7df67'::uuid, 'countable', 'mosques'),  -- mosque
  ('e2de1e87-d7f1-4d16-b65d-7b0c16dcb687'::uuid, 'countable', 'mosquitoes'),  -- mosquito
  ('ae1193e5-b9d3-4548-839b-8d916a19167c'::uuid, 'uncountable', null),  -- moss
  ('0f94e963-d219-4c79-9688-3fd8b2f40e4a'::uuid, 'countable', 'mothers'),  -- mother
  ('2c64547f-a5ce-4082-a7b3-3eda4894b858'::uuid, 'uncountable', null)  -- motivation
) as v(id, countable, plural)
where w.id = v.id and w.countable is null and w.plural is null;

-- Check (words_in_batch and with_countable should both be 334):
select count(*) as words_in_batch, count(countable) as with_countable, count(plural) as with_plural from public.words where id in ('63c9eb63-4676-4d17-84a7-e6e775af4831'::uuid, '8b641550-1a0e-4218-abcd-f730a4d9661f'::uuid, 'e35e760a-ec00-4a3f-afdc-6f8ec5386bf7'::uuid, '744852df-520f-4351-84a5-4af4925ce1da'::uuid, '49c8cd60-8b49-4a2b-bd75-8d49349029a4'::uuid, '9638245a-66bf-4777-8e3c-b1fa5cbf8489'::uuid, '76c23b2a-273a-4e28-8d0e-1db2a68560bd'::uuid, 'faeb7cf3-e649-4f2d-9e8e-83bb4ccf79fd'::uuid, '412e64c1-96e9-4eac-bdd3-19e125693a94'::uuid, 'bd512f1a-59d3-462c-b901-e505d87384bd'::uuid, 'c8b29254-1703-4282-968a-1b58baaa4985'::uuid, '4abe93bc-9eb7-49f9-9063-2f293aa98a4b'::uuid, 'ad08d9bc-ecab-4ccc-9b98-66d8c36fec79'::uuid, 'b8ecd1c0-5d8a-4e6b-98f7-8f21c82e47a4'::uuid, '568c479c-429e-4d1d-9245-e31e25b4255a'::uuid, '04cd19ff-e605-4e2c-8c33-228b4b00771a'::uuid, 'b784f1cc-a1de-4e59-9b7b-692dac75c455'::uuid, '822ab66c-b808-4fe2-8e1e-8be125e2ad56'::uuid, '97ed7513-f593-4202-b8f7-af326913336f'::uuid, 'c5e6c567-fde8-418d-9042-3290cc737954'::uuid, '24716235-d0dc-4098-8b18-c8efb194e6a3'::uuid, '7ffe2f1a-faca-425e-a0c8-9b8239f68fc3'::uuid, '6b6b8dcf-0158-42dd-8fc1-57b6742514bd'::uuid, '8b707495-51fa-4e95-aa11-12e9423702a6'::uuid, '0aec9adc-3e6c-405e-98d1-3676cebe0816'::uuid, '74725f1f-e35a-4337-b947-196d9fe0aa68'::uuid, '853b0652-1d92-4756-97ca-6ea1c3815519'::uuid, 'f25d7324-0990-48f0-8302-a83b34a6cdb2'::uuid, 'f1c7569e-816f-4896-aa4c-98d4ec7f8469'::uuid, 'fcd8bd63-97fe-4a24-8850-82276e4f9ff0'::uuid, 'cd45e44d-0b5e-4fd3-ae5c-306d97691fd5'::uuid, 'fa4c2f99-e178-4b79-b169-134dbf347953'::uuid, '46c25ffa-344b-4902-aa93-53ad3078da26'::uuid, '1b5cbb8d-8b4c-4c27-a541-86d7e9cba2f3'::uuid, '59dc461d-9b99-47fe-83d8-9365765a17d5'::uuid, '99cb6724-3995-4800-aa38-d634aeec31e9'::uuid, '41fdeaf6-2d4d-43cc-a0e5-19fb5c2abecf'::uuid, '5078f897-5e7a-4eee-bcfa-7059c312a445'::uuid, '92d18b55-288a-44e4-8e26-702b93c9bfe4'::uuid, '2dd66629-fe52-46d2-a4a5-c0b34a268bd2'::uuid, '254c0af6-37a1-4792-97bb-f6f21642826e'::uuid, 'd3be45c4-0cee-4ad9-815c-0123c7993424'::uuid, 'a4988920-4d76-477e-8b6b-9b20f0601f56'::uuid, 'c0229550-dc67-4ad0-9398-0ceb46dda0a4'::uuid, '7709dbf7-3d26-4de6-829f-9fa6461bcbd4'::uuid, 'dadfc1e6-019f-4070-80fc-89c4bf953269'::uuid, '3825c26b-1a2b-48ce-ace1-b7dcafa12040'::uuid, '8d3eb232-e771-432a-81f6-f33c2fea8e3f'::uuid, '1ae459a2-52f1-4ba2-8611-7aa3c1b62b1b'::uuid, 'aa70d0b5-b5f9-49a5-bba2-169ff8921da3'::uuid, '117e642a-9487-485d-a256-8c01db02c1ac'::uuid, '690ccec9-824c-425f-a08d-dbc9ea64c5f4'::uuid, 'eeb38d80-7006-4603-91bf-faf3ae3d8194'::uuid, '095454d6-6fa9-4267-a2c8-3d9de45818b2'::uuid, '3722571b-a152-4707-8e0d-4e95456ee058'::uuid, '43f63159-7e33-478f-9ca2-b594005f0698'::uuid, '9e39f4c8-faba-43cd-a5fc-5de37952bb49'::uuid, 'afa3b739-7beb-4c77-86c5-777f4d03d40e'::uuid, 'f202a7f7-af3f-4c35-900b-27f18da8c171'::uuid, '13ed3d55-5699-4c9d-82d5-128b883249c0'::uuid, '36dd9540-1f37-4763-82d5-39eab45a770a'::uuid, '7934b1fd-02ba-47bc-bb31-5f69b69c54d4'::uuid, '963b1f21-682d-4fa7-8847-c7dc94b03f5c'::uuid, '35d92308-d3b8-4243-b9fd-9a4a229231e9'::uuid, 'fa6e57f3-9156-45c8-999a-c83541fc63f9'::uuid, 'f796a723-cb68-471e-9c47-807e30ff7b85'::uuid, '6fa25adc-043a-4d45-8f72-89f495173d54'::uuid, 'a770754b-06ac-4d43-879e-be64f150778c'::uuid, 'b2060078-3f4b-439c-b388-7f3f082c1772'::uuid, '923b7034-8e52-483b-a4da-4f16e572e365'::uuid, '6893e732-91b2-425c-9e2b-7aca5b5193c3'::uuid, '6536e1a7-1175-45d1-be85-fde418b0cb40'::uuid, 'b1532beb-90c2-49fd-a04a-a101e8d261fa'::uuid, '7dbbaba7-26cd-4e9a-96a6-1ecf5d621564'::uuid, '7085af71-1714-40fb-a81e-3b208deedd3e'::uuid, '0202c6cd-6d4c-47a8-99c3-ef31ef6e07f7'::uuid, 'f320587f-7bf6-4d3e-b4d5-1497803ea2bf'::uuid, '644028f2-341d-49ac-81bb-d1b4ce20fc99'::uuid, 'bbeada3f-b273-4298-b934-81a18e3a40e8'::uuid, '569b91ba-473d-4b4b-9444-bbfad3c6fdf1'::uuid, '3983547a-4489-4f74-997f-5e78f4577adf'::uuid, '7cb24f12-1902-445a-8aa2-83f43e931102'::uuid, '145da995-6972-41f5-a0f3-76f99626604b'::uuid, 'b8ba236a-a166-4391-9e2b-6add99a711f0'::uuid, 'd58d5b9a-9cf5-48e4-b567-87b2fa4968b1'::uuid, 'f9ccd368-b976-429c-a0ef-9a36cd1b6fd7'::uuid, 'd95e0b88-9b2f-4c37-ac2b-38d28143fad0'::uuid, '85fc8488-7ebd-46b0-aab0-352beefe47e3'::uuid, '0441990e-3664-45d6-96df-40a23f5932ba'::uuid, 'dd221a2c-500e-4e1b-a067-f1b930d70cc0'::uuid, '883c9c0c-837b-4509-94cc-3c860c2e6c9b'::uuid, '28fe8890-1c3e-46d4-b6a3-c5426afcbf8a'::uuid, 'f653c791-b93a-4832-82e0-07b40f283ee6'::uuid, 'e70a63d1-bee6-492a-9d31-6ade02e06719'::uuid, 'a2ab9081-17e9-465d-b27c-58c671ffecde'::uuid, 'b1316cfc-418a-49a2-8fab-5c82fc8b5519'::uuid, '3897f562-6f79-4d5c-aaa4-4770d01452cd'::uuid, '46bdd798-9421-4151-b536-14cec80a201d'::uuid, '627dee0e-7197-4129-ae4d-7d498c42fe92'::uuid, '4b667750-0bc2-4207-a3c1-bc69e2de343c'::uuid, '01362056-2680-4053-8777-7c31352c2788'::uuid, '39480e42-4fd0-4c0d-8241-efcf6b17aed9'::uuid, 'a3290294-7c78-4414-9ea0-c0f13c8aeea1'::uuid, '025fbc93-136c-46c6-8adf-4e2e5f01b1cf'::uuid, '596cfd61-c6f6-4ccd-8c1c-6a609efdd7c8'::uuid, 'cea5acf9-64ac-4534-8a50-340545346033'::uuid, '8ff49d61-0348-4a55-90f9-11b59086f81d'::uuid, '3e094319-49e4-44bd-ae6d-084a0dcec45f'::uuid, '60db49d1-939a-44ee-b7f3-70238bbf5d4b'::uuid, 'f1914bf0-73ca-4679-b6ca-720d25077cdb'::uuid, '2d38604b-d0cf-4360-b6fa-c5ebb828ea06'::uuid, '922ff0ce-112a-4587-bb06-d13b1908d348'::uuid, '38026675-5dad-483e-b3b8-467c975b369d'::uuid, '876ce248-aa7e-4d71-8794-9f66869f082d'::uuid, 'ff59ca54-aa7f-4e2d-9697-efe573f0ef1a'::uuid, 'd858e84a-1531-4bcc-bef5-d182f0af108a'::uuid, '60133f39-795a-40bb-ba5e-ff663ca824f1'::uuid, '3c3705c3-3b9e-4d39-850a-a2cc67f6e83b'::uuid, '6fcdb90e-dd90-4f1c-98d0-06d0a4c2b244'::uuid, '81f8be8a-d62a-40fc-b25c-305d82fb43d8'::uuid, '8d293cb1-024c-4521-b645-e80174e18a4c'::uuid, '00f505a0-507c-4086-9ed4-b60ea56de3b0'::uuid, '8eccb9d8-4e00-43eb-bc4c-6b2874410ac3'::uuid, '8aaad148-93ff-43b7-9520-9f353e66f26f'::uuid, 'ca1d2d5b-dc71-4b10-a3f6-31bb8d41446a'::uuid, '96858419-a6a6-4d21-9b9a-1a16c72bf862'::uuid, '76950fe7-f205-4394-8c94-b5058635565d'::uuid, '0810d8ab-5b41-48ed-b381-897725dd6e5d'::uuid, 'bb1d9b05-91e2-4d8e-bfe3-cd81e6319aad'::uuid, 'ad9aae14-be5b-49ef-8122-943313df7a71'::uuid, '31a6e1d0-1225-4de7-b603-1dce54e7c39c'::uuid, '2d59e8fa-a4b6-4251-b2dc-cb410a5e6a01'::uuid, 'e7bad98c-360d-4dfb-8eb4-da391a800067'::uuid, '7c2ecfce-7e1b-4a82-8d33-2896e0834e18'::uuid, 'af5213d6-f64d-4e81-9d1b-63e2b59d44b9'::uuid, 'b2093f0d-97dd-4637-851e-b50f07b6bf7c'::uuid, '0f055c89-a25f-4249-9c98-0206c655a944'::uuid, 'ff4e73f9-14fc-417c-a5cf-e17d4eb98716'::uuid, 'bf7173ad-54f4-4118-a2c3-c9a5eea48e30'::uuid, 'c3c761e2-735a-4bc5-8133-aa87ed96be35'::uuid, '025194a3-1a6d-414a-9e02-2f037318f3fd'::uuid, '9e826bed-01e3-4368-8748-0207598624c4'::uuid, '7d8786c6-fda1-45db-ac20-5a9ffa5e1fa7'::uuid, 'f384c041-8cff-4db2-9281-ddb5f78279bf'::uuid, '65ca0224-8a09-4733-8a36-28d98017d1a5'::uuid, 'c60b4209-7626-45b0-8dec-8b395c9acdd9'::uuid, 'b923aeb9-077d-4815-bbec-9a5826d532a6'::uuid, '39ac9c69-7ffb-4d02-8581-23833934f4ab'::uuid, '85782b57-ffd0-430d-ac4a-09290eef57dd'::uuid, '32abd99a-4135-490a-98cf-b4160d516ef1'::uuid, '777fa606-292b-4d81-9643-53150467be7d'::uuid, '8d29daa9-7728-4ad7-a4d1-4b50280c0d0b'::uuid, '63ee0506-e795-408e-9233-e58ed2c5ddf9'::uuid, '9723a370-4c53-4d2e-aa3a-b77e74b2bba9'::uuid, '1335793a-a7b8-47f8-a28a-0f40b5e59648'::uuid, 'bb3e24e0-85a0-4cfb-bde4-f76e45bfb7b0'::uuid, 'cd6f4e79-f3c5-44f0-a553-d57596d1fb00'::uuid, '708db079-2520-452a-8d74-bc6383b1b2ef'::uuid, 'c3c70f1d-0356-48e6-917a-3a32d539270f'::uuid, 'f85d0d96-2171-443c-b17b-bc5c77227549'::uuid, 'e6456a03-5e5c-42b5-bb92-86e69e990754'::uuid, '581a0830-4f8e-4a73-a3d1-848b1877374e'::uuid, '80b85d25-3ece-4f0d-acf2-e2f67b7d3559'::uuid, '409ac1fa-6747-4904-b9b9-91981ae55efa'::uuid, '5aa123df-ea62-467d-8b12-1c473da143cf'::uuid, '21299dd2-b12b-42ee-9ab1-8238b4ca1bc8'::uuid, '1328391f-5c96-49df-8d7a-0159414d1665'::uuid, '2dabb755-b49f-4e63-abf2-169331a932fd'::uuid, '9af990af-5922-444a-93ae-ecfa6184729d'::uuid, '8aa0584e-496f-41ea-9169-49e7d8762f68'::uuid, 'ba468e4c-a471-47f8-a07b-fc1a5b6ab63d'::uuid, 'b2b6c136-a054-40c1-b8db-63c99d6032fb'::uuid, '70c6bb31-ebae-4b9d-aaf8-1fbb6725dd1a'::uuid, '9e8fb3f9-afa7-4a1b-96e3-404116316ffd'::uuid, '6344cb7d-3263-4f56-beba-e92b66c1a252'::uuid, 'aec83518-119c-4b5f-863f-83c337748ff7'::uuid, '321f46e3-cfa4-42f8-a0c9-8bd78df5b911'::uuid, '50595d12-4806-49e8-adc3-cbbfb09e09b9'::uuid, 'd7004eba-9bd6-420b-954b-b9709fbc1609'::uuid, '7c7364aa-00ca-4cf2-bee5-a3fc82dd5401'::uuid, 'd454449f-f6bd-4cb3-8d16-b4c512c67c74'::uuid, '860fa8b7-741d-4b33-a0cd-5ad06e408a01'::uuid, '94fc98f7-8fbd-488e-a867-fa8a111fbee1'::uuid, '34cbebdd-a499-4671-b55f-81e181851d5d'::uuid, '61882535-e4c2-4865-9f4e-4ecb5e1ee886'::uuid, '754eb84a-65b5-4a2f-9d72-43919cad1951'::uuid, '7a1d1f09-9199-4489-bdef-5793c574fa3e'::uuid, '8fcd0427-4142-41a2-b16f-1f250ae7e1f3'::uuid, '6016e6d8-5016-48b6-b33a-138e14e0fbd2'::uuid, '5cee9c8e-f9a0-49f9-8696-d474f3cfb15a'::uuid, 'dc1984a1-8631-469a-a6b4-a3835ed01d7f'::uuid, '49729519-7bbd-49ed-bda6-270dbe219ee0'::uuid, '1ad755f2-3ea9-4594-8f7b-27fbd0fdd770'::uuid, 'eda02163-71e4-4352-b88e-e0885f523bb2'::uuid, '0e657f6c-7802-44fe-a0fa-390b816a6400'::uuid, '91f3e303-44b5-4817-be72-a0c6cd44ba52'::uuid, 'f87e0da5-0a17-4213-9326-256e1d5a0893'::uuid, 'aaebdde7-729a-4ff9-b0c2-7f52c5423e5c'::uuid, '03767a9e-62f6-48f8-8121-2d99c7c41c38'::uuid, '7bd5c1b7-29d4-4cb1-92aa-5ea930c90e75'::uuid, 'c8ee80d3-9c4f-4e22-b015-0ea401a1ae94'::uuid, 'e2631b48-db0e-4478-af07-cb8a24eda43a'::uuid, '1534a03c-a853-45bd-86af-c85e6a2ce8dd'::uuid, '6f9e6193-393d-428f-b5cf-b2c5279e66d9'::uuid, 'f82e42ab-914a-44c2-b038-68430fa4e582'::uuid, '41db81df-c1a1-496d-8687-83d92dad2471'::uuid, 'b4053d60-0c84-4d47-8d0f-970f91e46bef'::uuid, '0c7f0449-55b6-43f8-a5d3-44c0ff3becf3'::uuid, 'ab302fa4-5ab4-4459-8d54-f45d55325e08'::uuid, '0e08e514-6196-4eb8-aa6a-0f54dd46860d'::uuid, '81bd0ce3-32f6-41f5-a84a-d8f5b82194c0'::uuid, '8cd7abce-7a46-4892-b02c-f72435d93097'::uuid, '9bb1e81e-18a4-4686-8720-2382ba5d8a37'::uuid, '7cea6d60-37ea-42fe-88e2-8b3ef4243b75'::uuid, 'd2efcb9c-cc5d-46d0-b686-f8cf37f89d7e'::uuid, '2ff23421-91f5-4ce3-9b62-5a34249dc5ef'::uuid, '8f3ebd40-cff1-456a-ac14-ac4fadbc82f9'::uuid, 'dd8aaa22-99be-4bfb-a95e-6e087ff3780d'::uuid, '451f7f7b-d03f-4c1f-966e-a8030758fec6'::uuid, 'd732b091-15b6-48e9-834e-ac3063ce2af6'::uuid, '484bc386-4fce-478c-b7e8-28de8a7dd077'::uuid, '0dd7003b-ed42-4b1b-bc4a-72e43f72e089'::uuid, 'e893f747-4d4c-42f3-bcf5-9a9858d36e32'::uuid, '79fb2917-3c8c-4ece-9587-54fdaa735804'::uuid, 'bf532e9f-246d-4e14-a066-342efec4e9e4'::uuid, 'd16f0fd0-a0e2-4d3d-a628-c4f218f05a4c'::uuid, 'f283f2d0-44d8-4c3a-ab05-147257e17acb'::uuid, '000dab5b-6973-4d26-af94-3538fdbce0ae'::uuid, '8901c813-b1ea-4563-b32c-27b7d7c05b6b'::uuid, 'bb45b71a-ea2b-4a5c-8856-fa8430cf3e21'::uuid, '5e0b4cd4-c745-472a-9d41-fd46771f1e9c'::uuid, 'f03c4a08-583f-453c-b6b7-ed5eb11c760a'::uuid, '46a1561b-62d2-4443-ab02-327dd493371b'::uuid, '6db5ecfc-6c8c-4ebc-ba7c-3f2bb7939310'::uuid, 'e8fab778-d294-4287-b551-1e2ad02855af'::uuid, '33e3475e-84a2-4502-a754-1a9002caf3ea'::uuid, 'be97fed0-95eb-4b27-8193-1927927ba55f'::uuid, '6f24d09c-a94f-43c1-a090-6aa9f34afbae'::uuid, '6569278c-54b5-4f33-a5f7-9380cac9240c'::uuid, 'ae137b9e-018d-4710-a1e3-c74dc40ad5f5'::uuid, 'd9e17634-60a7-4cd7-8c47-6e89c27e25b5'::uuid, '1d0b90ea-6443-490c-8376-728a61ca28c6'::uuid, 'be133ccc-708c-4916-b56e-20b3b1142b09'::uuid, 'e30b7ed2-9b04-40dd-8b19-6706bf716423'::uuid, 'd12e896d-ae4a-4c40-abea-6e1fc90fe49f'::uuid, '1d9e2745-2814-4adf-aa15-9c8f0fff8d7e'::uuid, '2de1f89a-f442-47e0-a9ec-aff792eaad34'::uuid, 'afc9b87d-d496-4f0e-af74-ef8b0377445c'::uuid, '77f1307a-4ac4-4a13-86ad-a68fe83b41d7'::uuid, 'e2c63ca0-ef33-44b2-a97e-8e415699ef52'::uuid, 'f94ba7fa-85ab-43a8-9017-1bda9def6227'::uuid, '84734399-f33f-4e04-8bf2-417dae7badf2'::uuid, '2f53d080-53bb-412f-a927-fdcf503ea76a'::uuid, 'de5ac43c-a253-4fcc-afbb-b0aba689455e'::uuid, '6607d446-3a30-4051-97e3-9111f7891b85'::uuid, '109fbac6-5286-4cb4-85ec-bc9f39557d32'::uuid, 'f1881352-ff79-4dc6-b482-3d601558d1f8'::uuid, 'b414923f-7a82-447d-8984-de71e1897f62'::uuid, '0c6292ef-bdeb-43db-893e-e504149c84d8'::uuid, 'e974141c-ec26-445a-a4f5-28de3dc17316'::uuid, 'c1a716ac-1d3a-47e5-9748-d4df8436a929'::uuid, 'e4e38843-fdfc-45e3-be3a-55b33067f87e'::uuid, '2c93e919-d272-44a4-9c7c-b4d6aafdc5c7'::uuid, 'd6341b7a-7bd9-4cab-826c-b73878644873'::uuid, '53c9b055-e222-4939-835f-51b7fcb332f0'::uuid, '63a4e948-76e7-4cd3-9bfa-a89e7f59373f'::uuid, '416121af-bba2-43c1-a126-ddd191b99b4b'::uuid, '0cc3187e-0a58-45a9-9795-53f5ad27e5b1'::uuid, '57499d11-860c-48da-bef2-cc0acce0ef97'::uuid, '4e2fa0f7-a03a-445a-ab40-1ff2a24a59b5'::uuid, '218a9cf3-d9e8-41c9-a001-01ce55022521'::uuid, '698b7e39-deb4-4a5e-90ca-606c08676d55'::uuid, 'cf74df9a-2b06-48d1-8eaa-e5709f5a76a0'::uuid, 'b71d2155-49b5-479f-b019-5118e44afe81'::uuid, '701c3b03-5825-4b47-87ec-61dabee03232'::uuid, '796945a9-2fdb-46a2-bca8-c2293518cf26'::uuid, '6b41cc61-c314-409a-a7f4-5e442c98add4'::uuid, 'c6e5f55c-f3a3-4d56-8150-9ab4daca4301'::uuid, '82bcd9b4-a631-40f9-9a68-7cf739d91222'::uuid, '90e29757-5397-4248-b680-3e067fa6fce4'::uuid, '389ab33e-17c3-43c7-9738-89ccd9ef26e5'::uuid, '86d9c7bf-134b-47b5-a56b-8a2530fe5994'::uuid, 'd30f04e5-d035-435b-8bdb-fbfb2ac281bc'::uuid, '14c35f81-9452-41a4-95ff-2c4d11a399e3'::uuid, 'ea73a975-341e-431c-98c6-2f41e09f0e8f'::uuid, 'be693455-950c-4cdc-8bf4-b7029090044c'::uuid, '0eda49b8-7b91-4dcb-80b3-95455823b12e'::uuid, '5d8f5c7e-9b65-47f4-a86e-b48e561cfae2'::uuid, 'ad92cdff-2825-463c-a2b6-66bb8209a331'::uuid, 'ef9219b0-e168-48cb-8d89-329daca5a1de'::uuid, '3335d5d8-d544-4c76-8072-15570d307ce8'::uuid, 'c1e33fee-1f8c-4623-8a90-3d7552a8f30c'::uuid, '83bd9e8d-3260-4e92-9e33-ed0a6e8a93e3'::uuid, 'd816d2b4-1f37-4950-924b-16a0648890e1'::uuid, '7ec75e53-9810-4bab-a88d-ced15ea854ce'::uuid, 'bfe5ef00-1f87-4c65-884f-3893ccb9da8a'::uuid, '56b5a31e-d5f3-4aa4-bb7a-23cff2050f5f'::uuid, '6e1a6615-464d-49f0-a29b-8a5b6ae0c5e8'::uuid, '34e6a458-c5fb-404e-9bd0-5271dfa8c3bc'::uuid, 'bc03fce0-215f-49f6-9584-681e3d1eddfb'::uuid, 'b84fc39e-08d0-486d-b3e5-972987ac5ae2'::uuid, 'd48eb01a-c19a-47db-a7ad-ad6b8402b4cc'::uuid, '2a8ae588-410c-4a69-9c72-e4294eeea583'::uuid, '80a8d894-4606-4a12-8667-a5031ee368b0'::uuid, '44f4fa15-990e-4022-9502-1eb87d1fda19'::uuid, '9283cb8b-6edb-41a8-9800-6d64958dbd77'::uuid, '46e3c250-bd64-43c2-9d51-82a224e2527e'::uuid, '8f05eca6-91db-4191-a4cd-1947f0070d0e'::uuid, '38136643-56bd-48bd-84e1-29e47503280a'::uuid, '046dbd38-e4c0-49b2-8af3-89cc15eaa3d8'::uuid, 'e8e73051-862a-41a0-af74-6872e5b7b501'::uuid, 'df256028-b5fa-4b66-b87f-1635e03a454c'::uuid, '196f683a-80a3-4e7b-b574-105d396a0b1c'::uuid, 'db15f906-cf67-430b-8a81-3e39b522ddc3'::uuid, 'f9765908-1dfb-4877-8d00-5063583e6b64'::uuid, 'a8a53db3-6af2-4c30-a20b-97a537d6bc06'::uuid, '74ef7ce2-58a7-4ba1-831d-442b8007b379'::uuid, '7990a992-0d55-4299-a4cb-84f715419ac6'::uuid, '6c480ca7-b0bb-4dd0-ab78-171f15ce1577'::uuid, 'd36b67ca-8f46-4e98-95db-1859c39f5399'::uuid, 'adfb1d6d-a7c8-4d6b-bb41-0ed42c897b6a'::uuid, '1f49c860-be59-453e-9819-18804c938fa7'::uuid, '9776a94f-2f8f-42e1-8feb-426c09a102aa'::uuid, '4da1aad5-5723-41ea-bd40-2666b0e69452'::uuid, '77994fa0-4857-4239-8914-37e128835eed'::uuid, 'da55428c-14dd-4906-b29e-a8069dee3b12'::uuid, '6c0ff757-c2ef-47b3-bbeb-1c0c6578f921'::uuid, 'e8f44e7d-7deb-428e-933a-a4232f87fa48'::uuid, '634009f4-483d-403d-82a4-459b2614a380'::uuid, 'd4adaaca-b03c-4a3e-abf6-d35395e7df67'::uuid, 'e2de1e87-d7f1-4d16-b65d-7b0c16dcb687'::uuid, 'ae1193e5-b9d3-4548-839b-8d916a19167c'::uuid, '0f94e963-d219-4c79-9688-3fd8b2f40e4a'::uuid, '2c64547f-a5ce-4082-a7b3-3eda4894b858'::uuid);
