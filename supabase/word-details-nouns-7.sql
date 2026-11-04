-- =====================================================================
-- Polycards: dictionary word details, nouns (batch 7 of 8), 336 words
-- Run AFTER polycards-word-details.sql. Only fills empty columns, so it is safe to run twice
-- and never overwrites a word fixed by hand. Readable list: the .csv file with the same name.
-- Made by: node scripts/wordDetails.mjs nouns 7
-- =====================================================================
update public.words as w
set countable = v.countable, plural = v.plural
from (values
  ('8e8bd672-2c8f-47b6-b333-cad19ed6dc2c'::uuid, 'countable', 'streets'),  -- street
  ('830f0e21-689d-4f0b-a4a1-384d689617ef'::uuid, 'both', 'strengths'),  -- strength
  ('6e060aeb-de0e-4a77-bf84-c9cb957cb006'::uuid, 'uncountable', null),  -- stress
  ('5a134fea-711a-435b-b506-6138829b0d04'::uuid, 'countable', 'strings'),  -- string
  ('2d24a0c9-24b3-4d3d-a04b-531210661fc1'::uuid, 'countable', 'stripes'),  -- stripe
  ('33e27055-3b0e-4968-9304-64b04fbc69d2'::uuid, 'countable', 'structures'),  -- structure
  ('c8e39542-5eb5-4861-9c1c-779335ace982'::uuid, 'countable', 'struggles'),  -- struggle
  ('31f793ab-b5c2-4d29-b5b3-1f1465c6c40c'::uuid, 'countable', 'students'),  -- student
  ('ae21aea6-2f43-43c0-a234-2d38ab37618f'::uuid, 'countable', 'studios'),  -- studio
  ('f1f794d7-271b-46bf-a4ea-cff8770ce7db'::uuid, 'uncountable', null),  -- stuff
  ('c3a83821-7265-4bc2-b54d-6d2824439d19'::uuid, 'countable', 'styles'),  -- style
  ('ec1c2531-ac5c-4877-b428-f761e06f775b'::uuid, 'countable', 'subjects'),  -- subject
  ('3497375f-5e69-422e-b1c9-3a3d1bd82fd7'::uuid, 'countable', 'submarines'),  -- submarine
  ('caea184e-4786-4e7c-8cd9-290b2c73ab63'::uuid, 'countable', 'substitutes'),  -- substitute
  ('d8131cca-de57-4d55-961e-b19b5191342d'::uuid, 'countable', 'subways'),  -- subway
  ('15e7488f-6022-4168-984c-9bd887ef9f63'::uuid, 'both', 'successes'),  -- success
  ('a3fbe20e-0c9f-4a6e-8af5-74a927430253'::uuid, 'countable', 'suffixes'),  -- suffix
  ('3524f303-bc42-4b55-a3cc-5a2f8826b5dd'::uuid, 'uncountable', null),  -- sugar
  ('12d85e37-02d3-47a9-b790-ba100a088006'::uuid, 'countable', 'suggestions'),  -- suggestion
  ('c4c30e59-ba16-4e23-b4c4-0d4e97041ec9'::uuid, 'countable', 'suits'),  -- suit
  ('bc382c28-31d9-4433-a298-dc7a63ddfe5c'::uuid, 'countable', 'suitcases'),  -- suitcase
  ('707150c3-b6ce-4bf6-807a-620cc11adc72'::uuid, 'countable', 'summaries'),  -- summary
  ('a9c7a0ea-ccf4-4b0c-b49e-ff2243f909e0'::uuid, 'both', 'summers'),  -- summer
  ('b7c72177-a4f9-4c45-96c0-5941d52f530f'::uuid, 'countable', 'summer festivals'),  -- summer festival
  ('33c13b4c-842d-40e2-b414-a2b71c1af259'::uuid, 'countable', 'summer vacations'),  -- summer vacation
  ('14d661aa-2ef9-40a8-b3ca-4c0ecd59c7bc'::uuid, 'countable', 'summits'),  -- summit
  ('7436c380-3973-43a8-a898-0f6f89834b10'::uuid, 'uncountable', null),  -- sumo
  ('33e072da-f7cd-4f31-bc30-8905fbe8f057'::uuid, 'countable', 'sunflowers'),  -- sunflower
  ('c2185590-c96b-438a-a1f8-569866075e6f'::uuid, 'plural', null),  -- sunglasses
  ('a84fda14-4c47-4ae8-a1e5-ecbd938b368b'::uuid, 'uncountable', null),  -- sunlight
  ('16ead6cc-9604-4fa9-9352-fdfd8ce21c5a'::uuid, 'countable', 'sunrises'),  -- sunrise
  ('ed11b1c6-1ac8-4eb4-9f20-2e81fb9409bd'::uuid, 'countable', 'sunsets'),  -- sunset
  ('332b79e9-dd53-47cd-8d62-9d237d707774'::uuid, 'uncountable', null),  -- sunshine
  ('8ebf05f2-28a4-48c4-87b5-4857637fa51a'::uuid, 'countable', 'superlatives'),  -- superlative
  ('a30e5e93-5b03-427e-848c-730aa4347775'::uuid, 'countable', 'supermarkets'),  -- supermarket
  ('51307b21-1252-4e9a-a420-3fea0f61e3cd'::uuid, 'countable', 'superstars'),  -- superstar
  ('a6c4d7e4-ffbe-4d35-a7d4-e5d46dd70442'::uuid, 'countable', 'superstitions'),  -- superstition
  ('a9d97f99-c344-4074-b658-0b86c9119d97'::uuid, 'countable', 'suppers'),  -- supper
  ('20f52180-d63f-4837-886f-ff4810c87f01'::uuid, 'both', 'supplies'),  -- supply
  ('fcdc083b-7360-446b-9e7f-3deebf6439e0'::uuid, 'countable', 'supporters'),  -- supporter
  ('e47f5716-e025-4b2a-b311-ba6bf3588d1e'::uuid, 'countable', 'surfaces'),  -- surface
  ('c4d25346-21bb-4e75-80e0-847bb761718e'::uuid, 'uncountable', null),  -- surfing
  ('20bdcca7-75b3-4c74-b08b-78a62cb13fa7'::uuid, 'countable', 'surgeons'),  -- surgeon
  ('3530ae7f-e2e5-4f4f-b9f8-67b35ed0f36b'::uuid, 'both', 'surgeries'),  -- surgery
  ('a7722257-f197-4a24-ace8-c04adbe7bab3'::uuid, 'countable', 'surprises'),  -- surprise
  ('fc383537-13ad-4757-a2e7-e278001a7077'::uuid, 'countable', 'surveys'),  -- survey
  ('7659eb87-b4cd-4af7-b5b8-02dcfadde470'::uuid, 'uncountable', null),  -- survival
  ('9ac53c03-156a-4fca-8814-b204eeeab91f'::uuid, 'countable', 'survivors'),  -- survivor
  ('55bbf685-b065-4eb4-ab5a-f6a8aa91ab00'::uuid, 'uncountable', null),  -- sushi
  ('f0ffae13-6ec9-434d-95f8-b3e9ccb72e93'::uuid, 'countable', 'suspects'),  -- suspect
  ('398ce7ca-e471-424d-b569-72c5f168c6bd'::uuid, 'both', 'suspicions'),  -- suspicion
  ('68d6a264-6011-486e-ad41-336c83adbcb6'::uuid, 'countable', 'sweaters'),  -- sweater
  ('c870a24f-8511-4507-928a-6e602a2b5610'::uuid, 'countable', 'sweatshirts'),  -- sweatshirt
  ('2e78f2dc-f42b-430c-be5a-0df5d4b159d7'::uuid, 'plural', null),  -- sweets
  ('d9ea5a66-c85e-4038-94ff-8cce21560cab'::uuid, 'countable', 'swimmers'),  -- swimmer
  ('190f30b8-a1d4-470d-9167-4aa18b836d68'::uuid, 'uncountable', null),  -- swimming
  ('0af04d6d-8b86-4209-885a-58690e69c9df'::uuid, 'countable', 'swimming meets'),  -- swimming meet
  ('560ceed4-6764-41d4-96f3-bfc5a9195913'::uuid, 'countable', 'swimming pools'),  -- swimming pool
  ('20791bfa-6386-41fa-ad4f-7ce19bfe42fb'::uuid, 'countable', 'swimsuits'),  -- swimsuit
  ('c3793037-13e6-46a7-a3fe-b72676635d23'::uuid, 'countable', 'switches'),  -- switch
  ('b7107fa1-ef8e-459a-84ab-e0f5aadf5b75'::uuid, 'countable', 'swords'),  -- sword
  ('599211a1-9308-445c-92b2-66b65a6f1722'::uuid, 'countable', 'symbols'),  -- symbol
  ('8958960d-00b6-4fce-949d-25e0918ccc40'::uuid, 'uncountable', null),  -- sympathy
  ('85f66316-4b5b-4845-a8f8-3487bd427b3c'::uuid, 'countable', 'symphonies'),  -- symphony
  ('966271b3-50a9-4dbe-90a0-527d180062d6'::uuid, 'countable', 'symptoms'),  -- symptom
  ('e9aaf353-ffee-4989-8024-e2cb8347ff4c'::uuid, 'countable', 'systems'),  -- system
  ('0b82a3c1-fd3b-4de4-8355-fba1226dfcc0'::uuid, 'countable', 'T-shirts'),  -- T-shirt
  ('23303109-3019-4be2-a4f9-10e1a8a25405'::uuid, 'countable', 'tables'),  -- table
  ('7210be0e-8a1f-4ad4-95e0-c9b590c570dc'::uuid, 'uncountable', null),  -- table tennis
  ('33386e06-c425-4e47-a557-dbd5e23e7bdd'::uuid, 'countable', 'tablespoons'),  -- tablespoon
  ('8fe7817c-1d55-45a1-b829-2306375c9501'::uuid, 'countable', 'tablets'),  -- tablet
  ('8e0a6657-4894-47ab-8457-1609c6f2e022'::uuid, 'countable', 'tags'),  -- tag
  ('0e35d00c-47cf-4e62-b63d-ec6539db77d3'::uuid, 'countable', 'takeoffs'),  -- takeoff
  ('7c0a7eb4-ce0c-48b6-a666-11072deac7bd'::uuid, 'countable', 'tales'),  -- tale
  ('0533a3da-4b5f-40d3-9da3-ca20910f6950'::uuid, 'both', 'talents'),  -- talent
  ('af254784-e211-4539-8a7f-6cdab2a76d6f'::uuid, 'countable', 'talk shows'),  -- talk show
  ('d9e2c8e1-b99c-4eed-a706-d0dadb010b2c'::uuid, 'countable', 'tanks'),  -- tank
  ('db27bb84-5155-4bf3-bd9b-9fe14ce21551'::uuid, 'both', 'tapes'),  -- tape
  ('d863f1ca-156c-4881-b6e0-45f9a3e0c29f'::uuid, 'countable', 'targets'),  -- target
  ('69c33ea0-3df1-4cbf-ae35-996e29099e85'::uuid, 'countable', 'tasks'),  -- task
  ('aa405314-02e8-4cbe-9622-d44bbb17c725'::uuid, 'countable', 'tastes'),  -- taste
  ('266ca8d2-06a7-4c02-830b-fda2040b27a4'::uuid, 'countable', 'taxes'),  -- tax
  ('e2e4f72c-584a-4e40-acf8-15c662bb8f80'::uuid, 'countable', 'taxis'),  -- taxi
  ('714d4b5f-9054-49eb-a87b-4a384e488cfa'::uuid, 'both', 'teas'),  -- tea
  ('157ebb74-77ae-4356-ac29-dd74d03914dd'::uuid, 'countable', 'teachers'),  -- teacher
  ('47aa5fd1-219d-4514-8486-de1efad7d82e'::uuid, 'countable', 'teachers'' offices'),  -- teachers' office
  ('0cbd31a6-c13c-4c3d-a146-600c02c07720'::uuid, 'uncountable', null),  -- teaching
  ('28c82d6d-236f-42fe-a8a1-ce3db2a39804'::uuid, 'countable', 'teams'),  -- team
  ('7cd58b00-3cab-45dd-bb3a-944491026449'::uuid, 'countable', 'teammates'),  -- teammate
  ('4e6ded36-e53e-4bdc-867b-6c310f6a1fb4'::uuid, 'uncountable', null),  -- teamwork
  ('8d250d7a-dc78-4b5a-80c5-8139ba47dad7'::uuid, 'countable', 'techniques'),  -- technique
  ('253e7792-0d60-43a6-b7fe-9452faee949c'::uuid, 'both', 'technologies'),  -- technology
  ('2f0271eb-1455-4bc9-a9b7-92ba43bb27c2'::uuid, 'countable', 'teenagers'),  -- teenager
  ('9a61ff63-9d4c-4337-8f4c-59168ab23727'::uuid, 'uncountable', null),  -- telecommunications
  ('34fefaf1-ae18-4102-8c8d-6b9babafc13e'::uuid, 'both', 'televisions'),  -- television
  ('085eede1-8b7c-48be-a301-3d8f136bc5ab'::uuid, 'both', 'tempers'),  -- temper
  ('5e1791f5-cd3e-4d62-9d73-6e4974b78f4c'::uuid, 'countable', 'temperatures'),  -- temperature
  ('dc1c5307-b36d-475c-910f-0ac72b3c29d9'::uuid, 'countable', 'temples'),  -- temple
  ('e30d1dc6-4f6c-4e04-8403-caeb4b228f53'::uuid, 'countable', 'tendencies'),  -- tendency
  ('cab1b6d4-23a4-47e2-8d5e-c512638ae968'::uuid, 'uncountable', null),  -- tennis
  ('ded6b8be-f1ed-43bd-9429-05e82b151c7a'::uuid, 'both', 'tensions'),  -- tension
  ('58158839-125a-4831-914e-36420eb322b1'::uuid, 'countable', 'tents'),  -- tent
  ('e20e0c96-0fa2-4047-8218-94f6fc7e8581'::uuid, 'countable', 'terms'),  -- term
  ('2a4f1e3c-737b-4df2-84d7-8c2a495672b4'::uuid, 'countable', 'terminals'),  -- terminal
  ('d8cd1d9d-9edc-4b2a-ba27-6bb01b57de32'::uuid, 'uncountable', null),  -- terrorism
  ('b94ec5ca-56bd-4115-b1ea-32a0b40e91d0'::uuid, 'countable', 'tests'),  -- test
  ('fcffd99d-2467-4a24-85cf-02cd48901b9b'::uuid, 'countable', 'text messages'),  -- text message
  ('7d234979-ecb2-4ed6-9baa-63f8578cf74f'::uuid, 'countable', 'textbooks'),  -- textbook
  ('e67481d3-3f75-4fb6-801f-bf51118619c8'::uuid, 'countable', 'theaters'),  -- theater
  ('27ef8a2b-2547-4682-8983-0abb17127c52'::uuid, 'both', 'thefts'),  -- theft
  ('ab06e51c-bdf4-4ae4-8cb0-8f62a1763f35'::uuid, 'countable', 'theories'),  -- theory
  ('3c196d36-b172-41b8-9472-4d9d9d1765c1'::uuid, 'both', 'therapies'),  -- therapy
  ('f8aa4fb5-4b73-443a-85e0-5d54b942e6b5'::uuid, 'countable', 'thieves'),  -- thief
  ('64fd35bc-85c5-49ed-bc6d-71beeb05aa7b'::uuid, 'countable', 'things'),  -- thing
  ('72d24f1d-0c07-4a45-8e33-b8800378f32e'::uuid, 'uncountable', null),  -- thirst
  ('3c3c545b-ae2b-4a44-92e9-88cd1e25eabb'::uuid, 'both', 'thoughts'),  -- thought
  ('b93db367-c27d-4af8-a414-1563f625bc76'::uuid, 'countable', 'threats'),  -- threat
  ('ce37aab1-0379-409c-ad79-fbd5649a6bd6'::uuid, 'countable', 'thrillers'),  -- thriller
  ('70b2b1b7-4c61-4538-b774-6f34f0f77388'::uuid, 'countable', 'thumbs'),  -- thumb
  ('aa34b16b-b490-48fd-88a5-33b5675dd44b'::uuid, 'uncountable', null),  -- thunder
  ('00f40d57-6a42-42a9-b110-d42975a00f84'::uuid, 'countable', 'thunderbirds'),  -- thunderbird
  ('c462522e-8f06-481b-b828-9fa721d1dee6'::uuid, 'countable', 'thunderstorms'),  -- thunderstorm
  ('1c4cd6aa-c644-40c1-8369-0f2af375d31b'::uuid, 'countable', 'ticks'),  -- tick
  ('bcff7530-f39e-46ee-8649-e85c34fa8e4e'::uuid, 'countable', 'tickets'),  -- ticket
  ('8b9e7058-78c6-448e-8bba-a994ddd2be06'::uuid, 'countable', 'tides'),  -- tide
  ('10f61241-15ed-49df-8997-3aae39935212'::uuid, 'countable', 'ties'),  -- tie
  ('15ee8eb1-eef9-4e13-85b6-248b9af36d38'::uuid, 'countable', 'tigers'),  -- tiger
  ('7eda3100-3c53-4b03-bbd1-e1d35c2a997c'::uuid, 'plural', null),  -- tights
  ('5a8da599-1587-4a57-b3d0-9af66c12295d'::uuid, 'countable', 'tiles'),  -- tile
  ('b5671a3d-6428-4aa2-aa06-388328ef2b31'::uuid, 'both', 'times'),  -- time
  ('0af1ad44-f6f3-486e-82c7-f1409486b1c4'::uuid, 'uncountable', null),  -- timekeeping
  ('01f383c8-8225-4356-9f52-683fdd172cf6'::uuid, 'countable', 'timetables'),  -- timetable
  ('ac1c5b54-82fd-4982-b1f1-480facf426ca'::uuid, 'both', 'tins'),  -- tin
  ('a9f9daa0-803c-4482-8c67-730236b28e38'::uuid, 'countable', 'tips'),  -- tip
  ('6989c8e2-96df-4b04-bdcd-24f10a9f2e4b'::uuid, 'countable', 'tires'),  -- tire
  ('f29b192e-f04a-443c-a9c5-a006d2752e87'::uuid, 'both', 'tissues'),  -- tissue
  ('ff417f54-4e2d-4086-92a0-5530335a4fad'::uuid, 'countable', 'titles'),  -- title
  ('648794db-75de-4cba-a556-199c2b3f392f'::uuid, 'uncountable', null),  -- toast
  ('644b385a-c35c-409f-a8c8-be1aabb22a7b'::uuid, 'uncountable', null),  -- tobacco
  ('90d25eb3-3b61-4f59-b68b-f617222e7e2c'::uuid, 'countable', 'toes'),  -- toe
  ('71902ae0-c3f5-47d0-9c4e-e8213b22d7a8'::uuid, 'countable', 'toilets'),  -- toilet
  ('70db36ad-054f-4f03-8fb4-2950a54ef0d2'::uuid, 'countable', 'tomatoes'),  -- tomato
  ('3d150f75-601a-4e44-98b9-e9108dbd7227'::uuid, 'countable', 'tons'),  -- ton
  ('45fea8d7-e12f-46cc-ad8d-6cfb8dfadfd4'::uuid, 'countable', 'tones'),  -- tone
  ('1e0092e5-385e-4e7a-acd7-6cc55138f6e4'::uuid, 'countable', 'tongues'),  -- tongue
  ('98e2458e-94d7-42d2-aadd-d76300e7cff4'::uuid, 'countable', 'tools'),  -- tool
  ('d6c20ed9-b8dd-4d2f-880a-7ef62cf40f1e'::uuid, 'countable', 'teeth'),  -- tooth
  ('e56368cf-5345-412b-9ca2-5468b5919377'::uuid, 'countable', 'toothaches'),  -- toothache
  ('4b2060c8-ce2a-45a6-bdc4-4cf5abadf120'::uuid, 'countable', 'toothbrushes'),  -- toothbrush
  ('1900668e-0111-4812-9779-59b31812e4e1'::uuid, 'uncountable', null),  -- toothpaste
  ('6fcd2ea1-c1e3-4b3b-aa46-b47ecd9f2934'::uuid, 'countable', 'tops'),  -- top
  ('65f252b9-2fca-46c6-8c8f-70d248979437'::uuid, 'countable', 'topics'),  -- topic
  ('7e233dbb-e9c8-422f-9441-67a71559657f'::uuid, 'countable', 'toppings'),  -- topping
  ('52808b46-5021-428c-a468-548200e6d320'::uuid, 'countable', 'tornadoes'),  -- tornado
  ('21e20c5b-40c2-4688-87f8-3f6d8b9fb3b3'::uuid, 'countable', 'totals'),  -- total
  ('241715f5-1b32-43a3-814b-a68f61eaa05f'::uuid, 'countable', 'totem poles'),  -- totem pole
  ('658881cc-3a26-41f0-bc68-410787534962'::uuid, 'countable', 'tours'),  -- tour
  ('580fbc53-3cd6-4b08-b4e7-689130f8cd92'::uuid, 'countable', 'tour guides'),  -- tour guide
  ('9fedb7c5-feae-4633-b398-27a836832d57'::uuid, 'uncountable', null),  -- tourism
  ('eecd7528-7b96-4df8-b606-f4f45d8baac4'::uuid, 'countable', 'tourists'),  -- tourist
  ('ec9d9101-2265-40cb-ab22-b658eb40e1e1'::uuid, 'countable', 'tournaments'),  -- tournament
  ('b7c0858c-a790-426d-b425-6d1ecc771582'::uuid, 'countable', 'towels'),  -- towel
  ('ee3e25e6-848e-4659-a55a-44cd3881fda3'::uuid, 'countable', 'towers'),  -- tower
  ('7cf8ad0c-8e18-4391-8aad-c8933f21c8e0'::uuid, 'countable', 'towns'),  -- town
  ('f1a72ea4-6e55-40da-ab07-695920b6f7f4'::uuid, 'countable', 'toys'),  -- toy
  ('9867802a-1204-4780-a263-d6af05937c09'::uuid, 'countable', 'traces'),  -- trace
  ('471a7b50-67a8-4d45-9366-903abad42422'::uuid, 'countable', 'tracks'),  -- track
  ('abc06061-5ca9-45b9-9d25-7ca599103537'::uuid, 'uncountable', null),  -- track and field
  ('93d5d533-892b-4b06-be28-a5b2be6f53eb'::uuid, 'uncountable', null),  -- trade
  ('d84a45e8-80e9-4cde-8b88-216f563b3a8f'::uuid, 'countable', 'traditions'),  -- tradition
  ('156c61d7-ce2f-41a5-9ca5-559a27031ca3'::uuid, 'uncountable', null),  -- traffic
  ('a87fbf35-55cf-4a47-aa1c-15ad12358870'::uuid, 'countable', 'traffic accidents'),  -- traffic accident
  ('0c0289d3-2987-46b5-8cef-f8ebe9db3019'::uuid, 'countable', 'traffic jams'),  -- traffic jam
  ('893741cc-f44b-4f5e-b67a-d503c6f8b46e'::uuid, 'countable', 'traffic lights'),  -- traffic light
  ('f1db0a72-eeac-4f9f-b1d6-528923e2cc69'::uuid, 'countable', 'tragedies'),  -- tragedy
  ('455e22fb-4912-4fcb-a348-4ae7d0b1b86f'::uuid, 'countable', 'trails'),  -- trail
  ('084f3f43-f1c2-4548-b1f4-bfb33e3f3985'::uuid, 'countable', 'trains'),  -- train
  ('1e521100-1c88-42e9-a623-c57f8076c150'::uuid, 'uncountable', null),  -- training
  ('84735ab4-7e5b-4366-b18c-5a12f89bf427'::uuid, 'countable', 'trams'),  -- tram
  ('7f3ec2f3-6c9a-4fa1-a4b9-e6a59b1227bd'::uuid, 'uncountable', null),  -- transport
  ('19fd7a79-562c-4ba0-a76b-418955a4d3fd'::uuid, 'uncountable', null),  -- transportation
  ('0cb31d2b-0365-4a37-9ef2-df05c61fbf08'::uuid, 'countable', 'traps'),  -- trap
  ('fbb8f92f-f1a7-409a-9fef-50a4145a171b'::uuid, 'uncountable', null),  -- trash
  ('1fa515a9-1e9f-4326-bdec-c4c678c57dbe'::uuid, 'countable', 'travel agents'),  -- travel agent
  ('782ba94c-90a5-4aac-bcbd-5145b32141b3'::uuid, 'countable', 'travelers'),  -- traveler
  ('bdc19d49-0b91-4a89-bc29-fa0c9e8cd745'::uuid, 'countable', 'treasures'),  -- treasure
  ('0e1afa79-7192-493c-9951-3eb0438fbfc1'::uuid, 'countable', 'treatments'),  -- treatment
  ('995f18ec-4994-4239-991e-cc949855bafd'::uuid, 'countable', 'trees'),  -- tree
  ('889f713a-e48f-44cc-882b-c028a8788829'::uuid, 'countable', 'trends'),  -- trend
  ('b7062947-e709-44aa-97f1-134d42bdc29e'::uuid, 'countable', 'tricks'),  -- trick
  ('8f67a905-19f2-480e-a38a-80d0dd80ded4'::uuid, 'countable', 'triggers'),  -- trigger
  ('86e13b17-24ed-4ac9-9b64-052f3e55d365'::uuid, 'countable', 'trips'),  -- trip
  ('8352347d-968a-4d30-9702-ba1389a1479c'::uuid, 'countable', 'triumphs'),  -- triumph
  ('314ecaaa-cb05-4852-9090-70636f6e4106'::uuid, 'uncountable', null),  -- trivia
  ('3606697a-8784-455f-a38f-df8230fb99ae'::uuid, 'both', 'troubles'),  -- trouble
  ('4fca9983-1ad0-49c6-ac92-a1b500f1112f'::uuid, 'countable', 'trucks'),  -- truck
  ('f0d18256-1d27-4968-96da-a520722cbba0'::uuid, 'countable', 'trumpets'),  -- trumpet
  ('7f9edfb5-2dca-4fac-afc5-cbc0a7b61b11'::uuid, 'both', 'truths'),  -- truth
  ('0b40b9bd-097c-4c7e-a02a-71767cf69b11'::uuid, 'countable', 'tsunamis'),  -- tsunami
  ('88d50ab2-1aa1-47fa-9508-d069acb31347'::uuid, 'both', 'tuna'),  -- tuna
  ('d45f26ee-d9e8-4eb8-b7ae-8e013fd8e514'::uuid, 'countable', 'tunes'),  -- tune
  ('a9d8bdf2-a2a2-43e2-a79b-9041117b88f4'::uuid, 'uncountable', null),  -- turbulence
  ('e330a6a8-a2e1-4091-a37b-9908d5d0275c'::uuid, 'uncountable', null),  -- turf
  ('9157cb25-ab93-46eb-a0d1-82f5938e80be'::uuid, 'countable', 'turkeys'),  -- turkey
  ('f44c007e-4419-425d-9c76-7f8455eee142'::uuid, 'countable', 'turtles'),  -- turtle
  ('8c9d1a50-5a8f-406f-83c8-9f5735fab9e0'::uuid, 'countable', 'TVs'),  -- TV
  ('44179791-5da3-4e96-90bc-d8fa164cd539'::uuid, 'countable', 'twins'),  -- twin
  ('d68881ab-f6cf-43d0-8508-f94696ce5b1f'::uuid, 'countable', 'types'),  -- type
  ('1ce74ea3-49ee-46a2-8677-77479fa47ecc'::uuid, 'countable', 'umbrellas'),  -- umbrella
  ('7a7cf6b3-edfe-4ec8-8bfb-3117bc4cc567'::uuid, 'both', 'uncertainties'),  -- uncertainty
  ('5ea963a4-2832-4e5c-9274-b9c2215119ba'::uuid, 'countable', 'uncles'),  -- uncle
  ('c9b36aef-60b8-46eb-ac13-4f1da3ac7881'::uuid, 'countable', 'underlines'),  -- underline
  ('c3090bed-1599-4303-a83a-c88ecd1a7365'::uuid, 'uncountable', null),  -- unemployment
  ('edac3aa9-5b36-499f-b0d5-a67bdc2a3c30'::uuid, 'countable', 'unicycles'),  -- unicycle
  ('f9fdc535-dc57-43f6-b901-44ab00d33518'::uuid, 'countable', 'uniforms'),  -- uniform
  ('5925acf2-66fc-4b8c-bbb9-1159066c893b'::uuid, 'countable', 'unions'),  -- union
  ('ee011ccb-5d89-4a29-a458-a817b2fe95ce'::uuid, 'countable', 'units'),  -- unit
  ('7e03090c-3d42-4843-8aad-0509eb8c3b68'::uuid, 'countable', 'universes'),  -- universe
  ('bf99c85c-eefd-4631-b15e-df5053250b02'::uuid, 'countable', 'universities'),  -- university
  ('bac69fa1-21c9-403e-97f9-22ece1dac925'::uuid, 'both', 'usages'),  -- usage
  ('3ed167f0-5617-492b-bbab-6b472ce715d0'::uuid, 'countable', 'vacancies'),  -- vacancy
  ('5e03c96d-a237-47c9-a6d2-f32ee678e1be'::uuid, 'countable', 'vacations'),  -- vacation
  ('3202c484-f31f-44d6-a663-0d91e264a149'::uuid, 'countable', 'valleys'),  -- valley
  ('68d43535-cd83-476c-bc5f-5370554a035d'::uuid, 'both', 'values'),  -- value
  ('0559d8fb-4e73-408b-aeb3-f58a682c61bd'::uuid, 'countable', 'vans'),  -- van
  ('cae0111a-262c-41bf-a881-20fb8e2c9275'::uuid, 'countable', 'variations'),  -- variation
  ('b7402440-9f24-4afd-8370-e1c67a6caa63'::uuid, 'both', 'varieties'),  -- variety
  ('98c2a720-87a3-4d53-8723-0cb751722a1d'::uuid, 'countable', 'vases'),  -- vase
  ('9f1c9e13-c2a7-4728-885e-d0dd5d8c18ab'::uuid, 'countable', 'vegetables'),  -- vegetable
  ('b09d0402-73d0-4983-815d-a4db6219f63f'::uuid, 'countable', 'vegetarians'),  -- vegetarian
  ('c16ea1bd-78c0-42e3-9069-d8c9c0e6ab6f'::uuid, 'countable', 'vehicles'),  -- vehicle
  ('28509179-09a6-4818-ad55-e46d12ebf3ac'::uuid, 'countable', 'vendors'),  -- vendor
  ('193a9577-4c94-459d-8cca-cfa524966e78'::uuid, 'countable', 'verbs'),  -- verb
  ('0c7fdc98-ffa8-450a-8a7c-ef4bee22ec36'::uuid, 'countable', 'vets'),  -- vet
  ('4fab8510-51f7-4fc7-9389-7c146485fdef'::uuid, 'countable', 'vice presidents'),  -- vice president
  ('0d426289-7939-4698-aee8-42c47a7b1f71'::uuid, 'countable', 'victims'),  -- victim
  ('664d8c2e-e87f-4978-a82d-09507bd70413'::uuid, 'countable', 'victories'),  -- victory
  ('20614fa5-87f4-4a8f-8585-a66b1e476954'::uuid, 'countable', 'videos'),  -- video
  ('2255b72b-f261-4df8-a750-8a4909a040ef'::uuid, 'countable', 'video clips'),  -- video clip
  ('a5f228c4-4d68-49b9-ac78-108a49b94c4b'::uuid, 'countable', 'video games'),  -- video game
  ('35b1cea5-5435-4df5-984e-f6c455bffc71'::uuid, 'countable', 'views'),  -- view
  ('1cad71e9-f490-4f31-8cf3-bb9321ff4d21'::uuid, 'countable', 'viewpoints'),  -- viewpoint
  ('c4db0ca5-7271-41f5-9a74-6e8585d3fa52'::uuid, 'countable', 'villages'),  -- village
  ('40de4c93-d6ed-4e40-844b-0488bab32cd3'::uuid, 'uncountable', null),  -- violence
  ('0f00954e-cb6e-45b8-8f0b-ad3976e11d97'::uuid, 'countable', 'violins'),  -- violin
  ('de81e72c-3bc3-4bb6-a5af-686a86ef4112'::uuid, 'countable', 'viruses'),  -- virus
  ('0551240c-bdd1-4a67-9efa-3cb1c36a1ee0'::uuid, 'countable', 'visas'),  -- visa
  ('dcb53d16-0be6-4e35-a097-45ece20380ca'::uuid, 'both', 'visions'),  -- vision
  ('4b6509ea-4d11-4a88-913d-3453c0a0e3df'::uuid, 'countable', 'visitors'),  -- visitor
  ('3cea89d3-7733-44b6-bc99-fb71e02fbf22'::uuid, 'both', 'vocabularies'),  -- vocabulary
  ('1091c1d6-3436-408b-8eb0-391d0fe39b30'::uuid, 'countable', 'voices'),  -- voice
  ('f73769e3-dd2c-414f-bba4-96fb90501d86'::uuid, 'countable', 'volcanoes'),  -- volcano
  ('e0a40da7-0c3c-4716-a759-5bd12255d521'::uuid, 'uncountable', null),  -- volleyball
  ('0f6323c3-e642-415d-a7aa-0a45f476ef85'::uuid, 'both', 'volumes'),  -- volume
  ('7b88b113-ec9c-4e43-8e92-11a8d7dafc1a'::uuid, 'countable', 'volunteers'),  -- volunteer
  ('2b9bf9c6-8cc9-4e83-9212-04f9c2302e9c'::uuid, 'countable', 'votes'),  -- vote
  ('1c3c38e7-452e-417d-82d5-7af66aabee25'::uuid, 'countable', 'vowels'),  -- vowel
  ('816fd4df-6c00-466a-978b-eb924b586b4b'::uuid, 'countable', 'voyages'),  -- voyage
  ('31cd4c9e-f290-4a47-a36a-a17e8be6d031'::uuid, 'countable', 'wages'),  -- wage
  ('073b30e3-35f7-473e-b7ef-d057bf786934'::uuid, 'countable', 'wagons'),  -- wagon
  ('71849cc2-a105-48de-a730-309065aac9f9'::uuid, 'countable', 'waiters'),  -- waiter
  ('999a4396-8c21-4a34-9538-1fa7d452898e'::uuid, 'countable', 'waitresses'),  -- waitress
  ('7dab25b2-be4b-439b-b79f-5ce888ec0d20'::uuid, 'uncountable', null),  -- walking
  ('f5070310-2f5d-4ae7-988e-d36f7348a256'::uuid, 'countable', 'walls'),  -- wall
  ('ca1c446a-f1e3-43d7-83b2-6d1c7013451d'::uuid, 'countable', 'wallets'),  -- wallet
  ('e59023c4-db13-4ba8-b675-80d7c2c7260a'::uuid, 'countable', 'wars'),  -- war
  ('2111d8ea-7de8-4632-81ac-a1734baae7b5'::uuid, 'countable', 'wards'),  -- ward
  ('f3a2bd79-dbe6-4d79-a8cd-a0e2113a1b56'::uuid, 'countable', 'wardrobes'),  -- wardrobe
  ('2cacbd5a-578e-4bb8-b071-8fba0f4ca088'::uuid, 'uncountable', null),  -- warmth
  ('d65bc228-91d7-4ea3-829d-210ebebcc561'::uuid, 'countable', 'warnings'),  -- warning
  ('4f0d0a6d-e4b6-4c5c-8bc5-74de3cf8fa3f'::uuid, 'countable', 'warriors'),  -- warrior
  ('4511d840-f853-4a7d-a8fe-3134777c9a57'::uuid, 'countable', 'washing machines'),  -- washing machine
  ('051ed0fc-410e-402a-a2e1-23b7a2feedee'::uuid, 'both', 'wastes'),  -- waste
  ('fa8c332c-329a-497f-855b-06dde3d03c58'::uuid, 'uncountable', null),  -- water
  ('78c2eddb-11a4-482c-9b11-758c9f0fd815'::uuid, 'countable', 'waterfalls'),  -- waterfall
  ('ba865520-7ea4-489d-903d-4671f82b539f'::uuid, 'countable', 'watermelons'),  -- watermelon
  ('e6596e93-0e5f-41e4-8f23-9b2b297f74cd'::uuid, 'countable', 'waves'),  -- wave
  ('beb1a644-a82e-4b2a-bfbe-62794b3b81af'::uuid, 'uncountable', null),  -- wax
  ('8cca7df1-a84e-4c75-ab37-3337e20e3ea6'::uuid, 'countable', 'ways'),  -- way
  ('f1e8b1fc-64be-470d-bcd4-769b97ec5a15'::uuid, 'countable', 'weaknesses'),  -- weakness
  ('4d6bb733-73f2-43df-b0a0-3f30e0f54f89'::uuid, 'uncountable', null),  -- wealth
  ('e52cc0e9-b9e3-4a9f-a6e6-37840fdab407'::uuid, 'countable', 'weapons'),  -- weapon
  ('ec84930b-480c-4b94-ab7d-b1287ec2687b'::uuid, 'uncountable', null),  -- weather
  ('fe6a17b8-2816-4910-b1ae-6e626a9b29c4'::uuid, 'countable', 'weather forecasts'),  -- weather forecast
  ('542897a0-510a-4d23-8455-9a4638c6af7d'::uuid, 'countable', 'webs'),  -- web
  ('a3cbe827-cd57-473a-a366-629b82fa2925'::uuid, 'countable', 'web pages'),  -- web page
  ('3d19e64f-953f-4f4b-b76e-35329d3bd15a'::uuid, 'countable', 'webcams'),  -- webcam
  ('e6ee3567-8e9a-49ce-9c65-ed342b970950'::uuid, 'countable', 'websites'),  -- website
  ('96605a8c-a575-4918-9599-eab7104771c8'::uuid, 'countable', 'weddings'),  -- wedding
  ('ec9cdd8e-fcb2-4fb2-9ea0-13fbd2b9abc4'::uuid, 'countable', 'weeks'),  -- week
  ('9abf3bcd-f5df-462a-a913-19277cbd12ee'::uuid, 'countable', 'weekdays'),  -- weekday
  ('074eb38b-2cba-468c-b8ab-bd74358317f7'::uuid, 'countable', 'weekends'),  -- weekend
  ('56d36151-6099-40b9-a2d8-abf7db8a3009'::uuid, 'both', 'weights'),  -- weight
  ('d2cc1166-7ee6-483d-b69e-db5849420bee'::uuid, 'countable', 'wells'),  -- well
  ('6bea2040-56c8-4d65-b968-e9ce47a13c42'::uuid, 'uncountable', null),  -- well-being
  ('b6d45d0e-3dd1-4a28-aa0b-d7a9b6d4aa22'::uuid, 'countable', 'wetlands'),  -- wetland
  ('be2d25c4-1ae3-457d-bff5-84a9bd48b66a'::uuid, 'countable', 'whales'),  -- whale
  ('cfdc019f-9652-4d10-a472-dcabe4a07d01'::uuid, 'countable', 'wheels'),  -- wheel
  ('073f8b2e-9013-40e0-9121-0c22750f2c26'::uuid, 'countable', 'wheelchairs'),  -- wheelchair
  ('fab41e6f-5977-471d-bd51-0926ea081efb'::uuid, 'uncountable', null),  -- wheelchair basketball
  ('babf0ce5-8bb7-46ee-b29a-dd450559ad44'::uuid, 'countable', 'whispers'),  -- whisper
  ('690a3e16-f93f-465a-87f1-297134a4046c'::uuid, 'countable', 'whistles'),  -- whistle
  ('62bf8ec3-7a9f-458d-9fec-440103de3628'::uuid, 'countable', 'wives'),  -- wife
  ('0ff6f161-8e5c-4ac3-8f7f-e4cc83d7b77d'::uuid, 'countable', 'wildernesses'),  -- wilderness
  ('97d5a20a-6885-4d9b-a3e8-966689e9f9c3'::uuid, 'uncountable', null),  -- wildlife
  ('9e53e2e7-24c6-4b5a-9519-6458dca9767f'::uuid, 'uncountable', null),  -- willingness
  ('7b4a1e46-0e45-439f-8945-27f15a82788e'::uuid, 'both', 'winds'),  -- wind
  ('f20ce0c2-dd38-4e23-8ae2-a1a735774999'::uuid, 'countable', 'windows'),  -- window
  ('14563255-904c-4d1b-a570-61dc9a7dd63b'::uuid, 'uncountable', null),  -- windsurfing
  ('767f6827-925b-4fbb-b15c-bd8ac7f1f31c'::uuid, 'both', 'wines'),  -- wine
  ('5828468b-dc62-45c6-a264-1c0ca24c1ac1'::uuid, 'countable', 'wings'),  -- wing
  ('0743114e-3ec5-4753-9182-3f404959d290'::uuid, 'countable', 'winners'),  -- winner
  ('072db415-1965-47c1-95b5-5ffc8534a805'::uuid, 'both', 'winters'),  -- winter
  ('5902db85-7afe-4456-be90-7bbef90ab0d9'::uuid, 'countable', 'winter vacations'),  -- winter vacation
  ('f76b953f-f415-4908-ae6f-d67ec9baab57'::uuid, 'countable', 'wires'),  -- wire
  ('a4781126-04b5-4151-9c5f-02b7a34ded90'::uuid, 'uncountable', null),  -- wisdom
  ('a4e6f090-ab59-4fdd-802f-d67246ad2481'::uuid, 'countable', 'witnesses'),  -- witness
  ('8f58c898-e9ab-40cf-8a37-7b918ece4e05'::uuid, 'countable', 'wizards'),  -- wizard
  ('123eedae-5080-4c35-be9f-bc477b4ab90a'::uuid, 'countable', 'women'),  -- woman
  ('619c3fee-78f5-4ede-a290-2470ca322149'::uuid, 'both', 'woods'),  -- wood
  ('58e595c0-05f4-4fee-8dfa-73e9f0008cc8'::uuid, 'uncountable', null),  -- wool
  ('93f3bcac-59f2-4e61-a35c-1892836e422e'::uuid, 'countable', 'words'),  -- word
  ('15a6ff9a-66f8-4f55-b167-9f9a44a1bf47'::uuid, 'both', 'works'),  -- work
  ('f8ef43ff-79fd-4b20-ae87-27a786882cf1'::uuid, 'countable', 'workers'),  -- worker
  ('c18cc477-fd81-490c-ba0c-ad3738c30815'::uuid, 'countable', 'workouts'),  -- workout
  ('0e4aae7c-6033-4cd7-840f-053433a30416'::uuid, 'countable', 'workplaces'),  -- workplace
  ('d66ef46a-f1a9-41c9-badb-1d075d624fa7'::uuid, 'countable', 'workshops'),  -- workshop
  ('d1d873ac-fa48-4d5c-af5e-021d50450c06'::uuid, 'countable', 'worlds'),  -- world
  ('d0685c15-f984-4f33-a8c1-66cb5948a93e'::uuid, 'countable', 'wounds'),  -- wound
  ('4b834b48-2cd8-49bf-a4eb-fe44e364a7d7'::uuid, 'countable', 'wrists'),  -- wrist
  ('7fc3683d-b354-414e-a6e1-42c637950165'::uuid, 'countable', 'wristwatches'),  -- wristwatch
  ('0dff014f-5eb1-439a-8dc1-b3388cfa93da'::uuid, 'countable', 'writers'),  -- writer
  ('b55b04f7-5639-44b9-9ab9-b29351513aad'::uuid, 'both', 'writings'),  -- writing
  ('24e61b72-9cd1-4307-beea-195165a13170'::uuid, 'countable', 'yards'),  -- yard
  ('65a62896-fdbb-4095-965f-4797694cd557'::uuid, 'countable', 'years'),  -- year
  ('29238f44-edb2-4596-b3c7-7965bec740a6'::uuid, 'uncountable', null)  -- yoga
) as v(id, countable, plural)
where w.id = v.id and w.countable is null and w.plural is null;

-- Check (words_in_batch and with_countable should both be 336):
select count(*) as words_in_batch, count(countable) as with_countable, count(plural) as with_plural from public.words where id in ('8e8bd672-2c8f-47b6-b333-cad19ed6dc2c'::uuid, '830f0e21-689d-4f0b-a4a1-384d689617ef'::uuid, '6e060aeb-de0e-4a77-bf84-c9cb957cb006'::uuid, '5a134fea-711a-435b-b506-6138829b0d04'::uuid, '2d24a0c9-24b3-4d3d-a04b-531210661fc1'::uuid, '33e27055-3b0e-4968-9304-64b04fbc69d2'::uuid, 'c8e39542-5eb5-4861-9c1c-779335ace982'::uuid, '31f793ab-b5c2-4d29-b5b3-1f1465c6c40c'::uuid, 'ae21aea6-2f43-43c0-a234-2d38ab37618f'::uuid, 'f1f794d7-271b-46bf-a4ea-cff8770ce7db'::uuid, 'c3a83821-7265-4bc2-b54d-6d2824439d19'::uuid, 'ec1c2531-ac5c-4877-b428-f761e06f775b'::uuid, '3497375f-5e69-422e-b1c9-3a3d1bd82fd7'::uuid, 'caea184e-4786-4e7c-8cd9-290b2c73ab63'::uuid, 'd8131cca-de57-4d55-961e-b19b5191342d'::uuid, '15e7488f-6022-4168-984c-9bd887ef9f63'::uuid, 'a3fbe20e-0c9f-4a6e-8af5-74a927430253'::uuid, '3524f303-bc42-4b55-a3cc-5a2f8826b5dd'::uuid, '12d85e37-02d3-47a9-b790-ba100a088006'::uuid, 'c4c30e59-ba16-4e23-b4c4-0d4e97041ec9'::uuid, 'bc382c28-31d9-4433-a298-dc7a63ddfe5c'::uuid, '707150c3-b6ce-4bf6-807a-620cc11adc72'::uuid, 'a9c7a0ea-ccf4-4b0c-b49e-ff2243f909e0'::uuid, 'b7c72177-a4f9-4c45-96c0-5941d52f530f'::uuid, '33c13b4c-842d-40e2-b414-a2b71c1af259'::uuid, '14d661aa-2ef9-40a8-b3ca-4c0ecd59c7bc'::uuid, '7436c380-3973-43a8-a898-0f6f89834b10'::uuid, '33e072da-f7cd-4f31-bc30-8905fbe8f057'::uuid, 'c2185590-c96b-438a-a1f8-569866075e6f'::uuid, 'a84fda14-4c47-4ae8-a1e5-ecbd938b368b'::uuid, '16ead6cc-9604-4fa9-9352-fdfd8ce21c5a'::uuid, 'ed11b1c6-1ac8-4eb4-9f20-2e81fb9409bd'::uuid, '332b79e9-dd53-47cd-8d62-9d237d707774'::uuid, '8ebf05f2-28a4-48c4-87b5-4857637fa51a'::uuid, 'a30e5e93-5b03-427e-848c-730aa4347775'::uuid, '51307b21-1252-4e9a-a420-3fea0f61e3cd'::uuid, 'a6c4d7e4-ffbe-4d35-a7d4-e5d46dd70442'::uuid, 'a9d97f99-c344-4074-b658-0b86c9119d97'::uuid, '20f52180-d63f-4837-886f-ff4810c87f01'::uuid, 'fcdc083b-7360-446b-9e7f-3deebf6439e0'::uuid, 'e47f5716-e025-4b2a-b311-ba6bf3588d1e'::uuid, 'c4d25346-21bb-4e75-80e0-847bb761718e'::uuid, '20bdcca7-75b3-4c74-b08b-78a62cb13fa7'::uuid, '3530ae7f-e2e5-4f4f-b9f8-67b35ed0f36b'::uuid, 'a7722257-f197-4a24-ace8-c04adbe7bab3'::uuid, 'fc383537-13ad-4757-a2e7-e278001a7077'::uuid, '7659eb87-b4cd-4af7-b5b8-02dcfadde470'::uuid, '9ac53c03-156a-4fca-8814-b204eeeab91f'::uuid, '55bbf685-b065-4eb4-ab5a-f6a8aa91ab00'::uuid, 'f0ffae13-6ec9-434d-95f8-b3e9ccb72e93'::uuid, '398ce7ca-e471-424d-b569-72c5f168c6bd'::uuid, '68d6a264-6011-486e-ad41-336c83adbcb6'::uuid, 'c870a24f-8511-4507-928a-6e602a2b5610'::uuid, '2e78f2dc-f42b-430c-be5a-0df5d4b159d7'::uuid, 'd9ea5a66-c85e-4038-94ff-8cce21560cab'::uuid, '190f30b8-a1d4-470d-9167-4aa18b836d68'::uuid, '0af04d6d-8b86-4209-885a-58690e69c9df'::uuid, '560ceed4-6764-41d4-96f3-bfc5a9195913'::uuid, '20791bfa-6386-41fa-ad4f-7ce19bfe42fb'::uuid, 'c3793037-13e6-46a7-a3fe-b72676635d23'::uuid, 'b7107fa1-ef8e-459a-84ab-e0f5aadf5b75'::uuid, '599211a1-9308-445c-92b2-66b65a6f1722'::uuid, '8958960d-00b6-4fce-949d-25e0918ccc40'::uuid, '85f66316-4b5b-4845-a8f8-3487bd427b3c'::uuid, '966271b3-50a9-4dbe-90a0-527d180062d6'::uuid, 'e9aaf353-ffee-4989-8024-e2cb8347ff4c'::uuid, '0b82a3c1-fd3b-4de4-8355-fba1226dfcc0'::uuid, '23303109-3019-4be2-a4f9-10e1a8a25405'::uuid, '7210be0e-8a1f-4ad4-95e0-c9b590c570dc'::uuid, '33386e06-c425-4e47-a557-dbd5e23e7bdd'::uuid, '8fe7817c-1d55-45a1-b829-2306375c9501'::uuid, '8e0a6657-4894-47ab-8457-1609c6f2e022'::uuid, '0e35d00c-47cf-4e62-b63d-ec6539db77d3'::uuid, '7c0a7eb4-ce0c-48b6-a666-11072deac7bd'::uuid, '0533a3da-4b5f-40d3-9da3-ca20910f6950'::uuid, 'af254784-e211-4539-8a7f-6cdab2a76d6f'::uuid, 'd9e2c8e1-b99c-4eed-a706-d0dadb010b2c'::uuid, 'db27bb84-5155-4bf3-bd9b-9fe14ce21551'::uuid, 'd863f1ca-156c-4881-b6e0-45f9a3e0c29f'::uuid, '69c33ea0-3df1-4cbf-ae35-996e29099e85'::uuid, 'aa405314-02e8-4cbe-9622-d44bbb17c725'::uuid, '266ca8d2-06a7-4c02-830b-fda2040b27a4'::uuid, 'e2e4f72c-584a-4e40-acf8-15c662bb8f80'::uuid, '714d4b5f-9054-49eb-a87b-4a384e488cfa'::uuid, '157ebb74-77ae-4356-ac29-dd74d03914dd'::uuid, '47aa5fd1-219d-4514-8486-de1efad7d82e'::uuid, '0cbd31a6-c13c-4c3d-a146-600c02c07720'::uuid, '28c82d6d-236f-42fe-a8a1-ce3db2a39804'::uuid, '7cd58b00-3cab-45dd-bb3a-944491026449'::uuid, '4e6ded36-e53e-4bdc-867b-6c310f6a1fb4'::uuid, '8d250d7a-dc78-4b5a-80c5-8139ba47dad7'::uuid, '253e7792-0d60-43a6-b7fe-9452faee949c'::uuid, '2f0271eb-1455-4bc9-a9b7-92ba43bb27c2'::uuid, '9a61ff63-9d4c-4337-8f4c-59168ab23727'::uuid, '34fefaf1-ae18-4102-8c8d-6b9babafc13e'::uuid, '085eede1-8b7c-48be-a301-3d8f136bc5ab'::uuid, '5e1791f5-cd3e-4d62-9d73-6e4974b78f4c'::uuid, 'dc1c5307-b36d-475c-910f-0ac72b3c29d9'::uuid, 'e30d1dc6-4f6c-4e04-8403-caeb4b228f53'::uuid, 'cab1b6d4-23a4-47e2-8d5e-c512638ae968'::uuid, 'ded6b8be-f1ed-43bd-9429-05e82b151c7a'::uuid, '58158839-125a-4831-914e-36420eb322b1'::uuid, 'e20e0c96-0fa2-4047-8218-94f6fc7e8581'::uuid, '2a4f1e3c-737b-4df2-84d7-8c2a495672b4'::uuid, 'd8cd1d9d-9edc-4b2a-ba27-6bb01b57de32'::uuid, 'b94ec5ca-56bd-4115-b1ea-32a0b40e91d0'::uuid, 'fcffd99d-2467-4a24-85cf-02cd48901b9b'::uuid, '7d234979-ecb2-4ed6-9baa-63f8578cf74f'::uuid, 'e67481d3-3f75-4fb6-801f-bf51118619c8'::uuid, '27ef8a2b-2547-4682-8983-0abb17127c52'::uuid, 'ab06e51c-bdf4-4ae4-8cb0-8f62a1763f35'::uuid, '3c196d36-b172-41b8-9472-4d9d9d1765c1'::uuid, 'f8aa4fb5-4b73-443a-85e0-5d54b942e6b5'::uuid, '64fd35bc-85c5-49ed-bc6d-71beeb05aa7b'::uuid, '72d24f1d-0c07-4a45-8e33-b8800378f32e'::uuid, '3c3c545b-ae2b-4a44-92e9-88cd1e25eabb'::uuid, 'b93db367-c27d-4af8-a414-1563f625bc76'::uuid, 'ce37aab1-0379-409c-ad79-fbd5649a6bd6'::uuid, '70b2b1b7-4c61-4538-b774-6f34f0f77388'::uuid, 'aa34b16b-b490-48fd-88a5-33b5675dd44b'::uuid, '00f40d57-6a42-42a9-b110-d42975a00f84'::uuid, 'c462522e-8f06-481b-b828-9fa721d1dee6'::uuid, '1c4cd6aa-c644-40c1-8369-0f2af375d31b'::uuid, 'bcff7530-f39e-46ee-8649-e85c34fa8e4e'::uuid, '8b9e7058-78c6-448e-8bba-a994ddd2be06'::uuid, '10f61241-15ed-49df-8997-3aae39935212'::uuid, '15ee8eb1-eef9-4e13-85b6-248b9af36d38'::uuid, '7eda3100-3c53-4b03-bbd1-e1d35c2a997c'::uuid, '5a8da599-1587-4a57-b3d0-9af66c12295d'::uuid, 'b5671a3d-6428-4aa2-aa06-388328ef2b31'::uuid, '0af1ad44-f6f3-486e-82c7-f1409486b1c4'::uuid, '01f383c8-8225-4356-9f52-683fdd172cf6'::uuid, 'ac1c5b54-82fd-4982-b1f1-480facf426ca'::uuid, 'a9f9daa0-803c-4482-8c67-730236b28e38'::uuid, '6989c8e2-96df-4b04-bdcd-24f10a9f2e4b'::uuid, 'f29b192e-f04a-443c-a9c5-a006d2752e87'::uuid, 'ff417f54-4e2d-4086-92a0-5530335a4fad'::uuid, '648794db-75de-4cba-a556-199c2b3f392f'::uuid, '644b385a-c35c-409f-a8c8-be1aabb22a7b'::uuid, '90d25eb3-3b61-4f59-b68b-f617222e7e2c'::uuid, '71902ae0-c3f5-47d0-9c4e-e8213b22d7a8'::uuid, '70db36ad-054f-4f03-8fb4-2950a54ef0d2'::uuid, '3d150f75-601a-4e44-98b9-e9108dbd7227'::uuid, '45fea8d7-e12f-46cc-ad8d-6cfb8dfadfd4'::uuid, '1e0092e5-385e-4e7a-acd7-6cc55138f6e4'::uuid, '98e2458e-94d7-42d2-aadd-d76300e7cff4'::uuid, 'd6c20ed9-b8dd-4d2f-880a-7ef62cf40f1e'::uuid, 'e56368cf-5345-412b-9ca2-5468b5919377'::uuid, '4b2060c8-ce2a-45a6-bdc4-4cf5abadf120'::uuid, '1900668e-0111-4812-9779-59b31812e4e1'::uuid, '6fcd2ea1-c1e3-4b3b-aa46-b47ecd9f2934'::uuid, '65f252b9-2fca-46c6-8c8f-70d248979437'::uuid, '7e233dbb-e9c8-422f-9441-67a71559657f'::uuid, '52808b46-5021-428c-a468-548200e6d320'::uuid, '21e20c5b-40c2-4688-87f8-3f6d8b9fb3b3'::uuid, '241715f5-1b32-43a3-814b-a68f61eaa05f'::uuid, '658881cc-3a26-41f0-bc68-410787534962'::uuid, '580fbc53-3cd6-4b08-b4e7-689130f8cd92'::uuid, '9fedb7c5-feae-4633-b398-27a836832d57'::uuid, 'eecd7528-7b96-4df8-b606-f4f45d8baac4'::uuid, 'ec9d9101-2265-40cb-ab22-b658eb40e1e1'::uuid, 'b7c0858c-a790-426d-b425-6d1ecc771582'::uuid, 'ee3e25e6-848e-4659-a55a-44cd3881fda3'::uuid, '7cf8ad0c-8e18-4391-8aad-c8933f21c8e0'::uuid, 'f1a72ea4-6e55-40da-ab07-695920b6f7f4'::uuid, '9867802a-1204-4780-a263-d6af05937c09'::uuid, '471a7b50-67a8-4d45-9366-903abad42422'::uuid, 'abc06061-5ca9-45b9-9d25-7ca599103537'::uuid, '93d5d533-892b-4b06-be28-a5b2be6f53eb'::uuid, 'd84a45e8-80e9-4cde-8b88-216f563b3a8f'::uuid, '156c61d7-ce2f-41a5-9ca5-559a27031ca3'::uuid, 'a87fbf35-55cf-4a47-aa1c-15ad12358870'::uuid, '0c0289d3-2987-46b5-8cef-f8ebe9db3019'::uuid, '893741cc-f44b-4f5e-b67a-d503c6f8b46e'::uuid, 'f1db0a72-eeac-4f9f-b1d6-528923e2cc69'::uuid, '455e22fb-4912-4fcb-a348-4ae7d0b1b86f'::uuid, '084f3f43-f1c2-4548-b1f4-bfb33e3f3985'::uuid, '1e521100-1c88-42e9-a623-c57f8076c150'::uuid, '84735ab4-7e5b-4366-b18c-5a12f89bf427'::uuid, '7f3ec2f3-6c9a-4fa1-a4b9-e6a59b1227bd'::uuid, '19fd7a79-562c-4ba0-a76b-418955a4d3fd'::uuid, '0cb31d2b-0365-4a37-9ef2-df05c61fbf08'::uuid, 'fbb8f92f-f1a7-409a-9fef-50a4145a171b'::uuid, '1fa515a9-1e9f-4326-bdec-c4c678c57dbe'::uuid, '782ba94c-90a5-4aac-bcbd-5145b32141b3'::uuid, 'bdc19d49-0b91-4a89-bc29-fa0c9e8cd745'::uuid, '0e1afa79-7192-493c-9951-3eb0438fbfc1'::uuid, '995f18ec-4994-4239-991e-cc949855bafd'::uuid, '889f713a-e48f-44cc-882b-c028a8788829'::uuid, 'b7062947-e709-44aa-97f1-134d42bdc29e'::uuid, '8f67a905-19f2-480e-a38a-80d0dd80ded4'::uuid, '86e13b17-24ed-4ac9-9b64-052f3e55d365'::uuid, '8352347d-968a-4d30-9702-ba1389a1479c'::uuid, '314ecaaa-cb05-4852-9090-70636f6e4106'::uuid, '3606697a-8784-455f-a38f-df8230fb99ae'::uuid, '4fca9983-1ad0-49c6-ac92-a1b500f1112f'::uuid, 'f0d18256-1d27-4968-96da-a520722cbba0'::uuid, '7f9edfb5-2dca-4fac-afc5-cbc0a7b61b11'::uuid, '0b40b9bd-097c-4c7e-a02a-71767cf69b11'::uuid, '88d50ab2-1aa1-47fa-9508-d069acb31347'::uuid, 'd45f26ee-d9e8-4eb8-b7ae-8e013fd8e514'::uuid, 'a9d8bdf2-a2a2-43e2-a79b-9041117b88f4'::uuid, 'e330a6a8-a2e1-4091-a37b-9908d5d0275c'::uuid, '9157cb25-ab93-46eb-a0d1-82f5938e80be'::uuid, 'f44c007e-4419-425d-9c76-7f8455eee142'::uuid, '8c9d1a50-5a8f-406f-83c8-9f5735fab9e0'::uuid, '44179791-5da3-4e96-90bc-d8fa164cd539'::uuid, 'd68881ab-f6cf-43d0-8508-f94696ce5b1f'::uuid, '1ce74ea3-49ee-46a2-8677-77479fa47ecc'::uuid, '7a7cf6b3-edfe-4ec8-8bfb-3117bc4cc567'::uuid, '5ea963a4-2832-4e5c-9274-b9c2215119ba'::uuid, 'c9b36aef-60b8-46eb-ac13-4f1da3ac7881'::uuid, 'c3090bed-1599-4303-a83a-c88ecd1a7365'::uuid, 'edac3aa9-5b36-499f-b0d5-a67bdc2a3c30'::uuid, 'f9fdc535-dc57-43f6-b901-44ab00d33518'::uuid, '5925acf2-66fc-4b8c-bbb9-1159066c893b'::uuid, 'ee011ccb-5d89-4a29-a458-a817b2fe95ce'::uuid, '7e03090c-3d42-4843-8aad-0509eb8c3b68'::uuid, 'bf99c85c-eefd-4631-b15e-df5053250b02'::uuid, 'bac69fa1-21c9-403e-97f9-22ece1dac925'::uuid, '3ed167f0-5617-492b-bbab-6b472ce715d0'::uuid, '5e03c96d-a237-47c9-a6d2-f32ee678e1be'::uuid, '3202c484-f31f-44d6-a663-0d91e264a149'::uuid, '68d43535-cd83-476c-bc5f-5370554a035d'::uuid, '0559d8fb-4e73-408b-aeb3-f58a682c61bd'::uuid, 'cae0111a-262c-41bf-a881-20fb8e2c9275'::uuid, 'b7402440-9f24-4afd-8370-e1c67a6caa63'::uuid, '98c2a720-87a3-4d53-8723-0cb751722a1d'::uuid, '9f1c9e13-c2a7-4728-885e-d0dd5d8c18ab'::uuid, 'b09d0402-73d0-4983-815d-a4db6219f63f'::uuid, 'c16ea1bd-78c0-42e3-9069-d8c9c0e6ab6f'::uuid, '28509179-09a6-4818-ad55-e46d12ebf3ac'::uuid, '193a9577-4c94-459d-8cca-cfa524966e78'::uuid, '0c7fdc98-ffa8-450a-8a7c-ef4bee22ec36'::uuid, '4fab8510-51f7-4fc7-9389-7c146485fdef'::uuid, '0d426289-7939-4698-aee8-42c47a7b1f71'::uuid, '664d8c2e-e87f-4978-a82d-09507bd70413'::uuid, '20614fa5-87f4-4a8f-8585-a66b1e476954'::uuid, '2255b72b-f261-4df8-a750-8a4909a040ef'::uuid, 'a5f228c4-4d68-49b9-ac78-108a49b94c4b'::uuid, '35b1cea5-5435-4df5-984e-f6c455bffc71'::uuid, '1cad71e9-f490-4f31-8cf3-bb9321ff4d21'::uuid, 'c4db0ca5-7271-41f5-9a74-6e8585d3fa52'::uuid, '40de4c93-d6ed-4e40-844b-0488bab32cd3'::uuid, '0f00954e-cb6e-45b8-8f0b-ad3976e11d97'::uuid, 'de81e72c-3bc3-4bb6-a5af-686a86ef4112'::uuid, '0551240c-bdd1-4a67-9efa-3cb1c36a1ee0'::uuid, 'dcb53d16-0be6-4e35-a097-45ece20380ca'::uuid, '4b6509ea-4d11-4a88-913d-3453c0a0e3df'::uuid, '3cea89d3-7733-44b6-bc99-fb71e02fbf22'::uuid, '1091c1d6-3436-408b-8eb0-391d0fe39b30'::uuid, 'f73769e3-dd2c-414f-bba4-96fb90501d86'::uuid, 'e0a40da7-0c3c-4716-a759-5bd12255d521'::uuid, '0f6323c3-e642-415d-a7aa-0a45f476ef85'::uuid, '7b88b113-ec9c-4e43-8e92-11a8d7dafc1a'::uuid, '2b9bf9c6-8cc9-4e83-9212-04f9c2302e9c'::uuid, '1c3c38e7-452e-417d-82d5-7af66aabee25'::uuid, '816fd4df-6c00-466a-978b-eb924b586b4b'::uuid, '31cd4c9e-f290-4a47-a36a-a17e8be6d031'::uuid, '073b30e3-35f7-473e-b7ef-d057bf786934'::uuid, '71849cc2-a105-48de-a730-309065aac9f9'::uuid, '999a4396-8c21-4a34-9538-1fa7d452898e'::uuid, '7dab25b2-be4b-439b-b79f-5ce888ec0d20'::uuid, 'f5070310-2f5d-4ae7-988e-d36f7348a256'::uuid, 'ca1c446a-f1e3-43d7-83b2-6d1c7013451d'::uuid, 'e59023c4-db13-4ba8-b675-80d7c2c7260a'::uuid, '2111d8ea-7de8-4632-81ac-a1734baae7b5'::uuid, 'f3a2bd79-dbe6-4d79-a8cd-a0e2113a1b56'::uuid, '2cacbd5a-578e-4bb8-b071-8fba0f4ca088'::uuid, 'd65bc228-91d7-4ea3-829d-210ebebcc561'::uuid, '4f0d0a6d-e4b6-4c5c-8bc5-74de3cf8fa3f'::uuid, '4511d840-f853-4a7d-a8fe-3134777c9a57'::uuid, '051ed0fc-410e-402a-a2e1-23b7a2feedee'::uuid, 'fa8c332c-329a-497f-855b-06dde3d03c58'::uuid, '78c2eddb-11a4-482c-9b11-758c9f0fd815'::uuid, 'ba865520-7ea4-489d-903d-4671f82b539f'::uuid, 'e6596e93-0e5f-41e4-8f23-9b2b297f74cd'::uuid, 'beb1a644-a82e-4b2a-bfbe-62794b3b81af'::uuid, '8cca7df1-a84e-4c75-ab37-3337e20e3ea6'::uuid, 'f1e8b1fc-64be-470d-bcd4-769b97ec5a15'::uuid, '4d6bb733-73f2-43df-b0a0-3f30e0f54f89'::uuid, 'e52cc0e9-b9e3-4a9f-a6e6-37840fdab407'::uuid, 'ec84930b-480c-4b94-ab7d-b1287ec2687b'::uuid, 'fe6a17b8-2816-4910-b1ae-6e626a9b29c4'::uuid, '542897a0-510a-4d23-8455-9a4638c6af7d'::uuid, 'a3cbe827-cd57-473a-a366-629b82fa2925'::uuid, '3d19e64f-953f-4f4b-b76e-35329d3bd15a'::uuid, 'e6ee3567-8e9a-49ce-9c65-ed342b970950'::uuid, '96605a8c-a575-4918-9599-eab7104771c8'::uuid, 'ec9cdd8e-fcb2-4fb2-9ea0-13fbd2b9abc4'::uuid, '9abf3bcd-f5df-462a-a913-19277cbd12ee'::uuid, '074eb38b-2cba-468c-b8ab-bd74358317f7'::uuid, '56d36151-6099-40b9-a2d8-abf7db8a3009'::uuid, 'd2cc1166-7ee6-483d-b69e-db5849420bee'::uuid, '6bea2040-56c8-4d65-b968-e9ce47a13c42'::uuid, 'b6d45d0e-3dd1-4a28-aa0b-d7a9b6d4aa22'::uuid, 'be2d25c4-1ae3-457d-bff5-84a9bd48b66a'::uuid, 'cfdc019f-9652-4d10-a472-dcabe4a07d01'::uuid, '073f8b2e-9013-40e0-9121-0c22750f2c26'::uuid, 'fab41e6f-5977-471d-bd51-0926ea081efb'::uuid, 'babf0ce5-8bb7-46ee-b29a-dd450559ad44'::uuid, '690a3e16-f93f-465a-87f1-297134a4046c'::uuid, '62bf8ec3-7a9f-458d-9fec-440103de3628'::uuid, '0ff6f161-8e5c-4ac3-8f7f-e4cc83d7b77d'::uuid, '97d5a20a-6885-4d9b-a3e8-966689e9f9c3'::uuid, '9e53e2e7-24c6-4b5a-9519-6458dca9767f'::uuid, '7b4a1e46-0e45-439f-8945-27f15a82788e'::uuid, 'f20ce0c2-dd38-4e23-8ae2-a1a735774999'::uuid, '14563255-904c-4d1b-a570-61dc9a7dd63b'::uuid, '767f6827-925b-4fbb-b15c-bd8ac7f1f31c'::uuid, '5828468b-dc62-45c6-a264-1c0ca24c1ac1'::uuid, '0743114e-3ec5-4753-9182-3f404959d290'::uuid, '072db415-1965-47c1-95b5-5ffc8534a805'::uuid, '5902db85-7afe-4456-be90-7bbef90ab0d9'::uuid, 'f76b953f-f415-4908-ae6f-d67ec9baab57'::uuid, 'a4781126-04b5-4151-9c5f-02b7a34ded90'::uuid, 'a4e6f090-ab59-4fdd-802f-d67246ad2481'::uuid, '8f58c898-e9ab-40cf-8a37-7b918ece4e05'::uuid, '123eedae-5080-4c35-be9f-bc477b4ab90a'::uuid, '619c3fee-78f5-4ede-a290-2470ca322149'::uuid, '58e595c0-05f4-4fee-8dfa-73e9f0008cc8'::uuid, '93f3bcac-59f2-4e61-a35c-1892836e422e'::uuid, '15a6ff9a-66f8-4f55-b167-9f9a44a1bf47'::uuid, 'f8ef43ff-79fd-4b20-ae87-27a786882cf1'::uuid, 'c18cc477-fd81-490c-ba0c-ad3738c30815'::uuid, '0e4aae7c-6033-4cd7-840f-053433a30416'::uuid, 'd66ef46a-f1a9-41c9-badb-1d075d624fa7'::uuid, 'd1d873ac-fa48-4d5c-af5e-021d50450c06'::uuid, 'd0685c15-f984-4f33-a8c1-66cb5948a93e'::uuid, '4b834b48-2cd8-49bf-a4eb-fe44e364a7d7'::uuid, '7fc3683d-b354-414e-a6e1-42c637950165'::uuid, '0dff014f-5eb1-439a-8dc1-b3388cfa93da'::uuid, 'b55b04f7-5639-44b9-9ab9-b29351513aad'::uuid, '24e61b72-9cd1-4307-beea-195165a13170'::uuid, '65a62896-fdbb-4095-965f-4797694cd557'::uuid, '29238f44-edb2-4596-b3c7-7965bec740a6'::uuid);
