-- =====================================================================
-- Polycards: dictionary word details, nouns (batch 3 of 8), 340 words
-- Run AFTER polycards-word-details.sql. Only fills empty columns, so it is safe to run twice
-- and never overwrites a word fixed by hand. Readable list: the .csv file with the same name.
-- Made by: node scripts/wordDetails.mjs nouns 3
-- =====================================================================
update public.words as w
set countable = v.countable, plural = v.plural
from (values
  ('cff6ed93-b7af-4edc-bd42-144606113d64'::uuid, 'countable', 'edges'),  -- edge
  ('aae444bf-305a-42e9-94dd-c359e02470d0'::uuid, 'countable', 'editions'),  -- edition
  ('83b744f9-d5ce-41ad-a13c-c714601dcd61'::uuid, 'countable', 'editors'),  -- editor
  ('17338b69-385e-454d-9bf8-d93a7c8e51f3'::uuid, 'uncountable', null),  -- education
  ('7ab9b9ac-87b6-4635-aaf8-198f49bc43ff'::uuid, 'countable', 'effects'),  -- effect
  ('46c2e9ae-40d1-4d00-a8ba-b0ce1c33bc47'::uuid, 'uncountable', null),  -- efficiency
  ('599e0c0e-d068-48f0-8503-04e6788e9d89'::uuid, 'both', 'efforts'),  -- effort
  ('03a873bf-080b-41a4-9f3e-25309e8aa595'::uuid, 'countable', 'eggs'),  -- egg
  ('56bd7c6e-6b91-419c-939d-88c2546955ad'::uuid, 'countable', 'eggplants'),  -- eggplant
  ('f3dc079e-8766-4aa6-bf51-c15efa0c0b8a'::uuid, 'countable', 'elbows'),  -- elbow
  ('33059e1b-a219-4263-bf80-0fad36f81fc8'::uuid, 'countable', 'elections'),  -- election
  ('4284ef6d-7f1f-4023-b43b-2f5266da0710'::uuid, 'uncountable', null),  -- electricity
  ('da4e627a-e72f-408e-8368-e69ae0543fbe'::uuid, 'countable', 'electrons'),  -- electron
  ('16a49b3e-00d8-4ee4-8ef4-6a42c295aaaf'::uuid, 'countable', 'elements'),  -- element
  ('8c02c562-4646-4d3e-93ff-455f20bdea01'::uuid, 'countable', 'elementary schools'),  -- elementary school
  ('8e4e7344-a24f-41d2-8b24-0e3d4bdc7f74'::uuid, 'countable', 'elephants'),  -- elephant
  ('7201115d-85ea-4fce-bc53-ab48066f4273'::uuid, 'countable', 'elevators'),  -- elevator
  ('df696419-6c56-44a4-88a4-e851b6b4782f'::uuid, 'both', 'emails'),  -- email
  ('1083d88f-7007-4dea-94ca-33979b923744'::uuid, 'both', 'embarrassments'),  -- embarrassment
  ('05c85aed-d56a-43f7-b8d9-3b9c39b2df83'::uuid, 'countable', 'emergencies'),  -- emergency
  ('606de167-db83-4f19-8141-9e50a2eb8403'::uuid, 'countable', 'emotions'),  -- emotion
  ('5bb5842d-bb40-49e3-bbed-cfad9dcb6fea'::uuid, 'countable', 'emperors'),  -- emperor
  ('6e059f5a-d43f-4990-b1cc-927223560e59'::uuid, 'uncountable', null),  -- emphasis
  ('bb250bf0-7da9-409f-a4c9-ea3f5f5e494f'::uuid, 'countable', 'empires'),  -- empire
  ('db160fdb-f376-48b1-9b6a-57ac68463347'::uuid, 'uncountable', null),  -- employment
  ('3e03b697-e37a-4463-b25d-6ed003710a8b'::uuid, 'countable', 'encounters'),  -- encounter
  ('d3e255f2-6ed4-4b24-b76e-f4dd38ef4dd1'::uuid, 'uncountable', null),  -- encouragement
  ('b1efa94c-c2ae-46e4-8908-6cc37626cac2'::uuid, 'countable', 'encyclopedias'),  -- encyclopedia
  ('dc28ed72-ec1e-4694-af4a-b1835e5d6000'::uuid, 'countable', 'ends'),  -- end
  ('3330eca8-6dde-40df-a456-e57793819923'::uuid, 'countable', 'endings'),  -- ending
  ('b15a3692-d3a4-4bfe-93e9-150f54b655b6'::uuid, 'countable', 'enemies'),  -- enemy
  ('74f3170b-2566-4ab5-9ee7-6c94cd2d3b8e'::uuid, 'uncountable', null),  -- energy
  ('f94e4dc0-c249-4bc6-8889-e4bf4282d689'::uuid, 'countable', 'engines'),  -- engine
  ('ff3c2dc0-06e5-418a-905b-67d3b9b25508'::uuid, 'countable', 'engineers'),  -- engineer
  ('c06aca5a-7ac8-47ff-afd1-ab65f0a57829'::uuid, 'uncountable', null),  -- engineering
  ('dacd7553-7464-45bc-9c8e-4ef1ee235fad'::uuid, 'uncountable', null),  -- enjoyment
  ('db8309ee-a981-4930-b342-86cd91ccd114'::uuid, 'countable', 'entertainers'),  -- entertainer
  ('fcf2c1c2-553c-43b0-b17a-1dc5ad8a142b'::uuid, 'uncountable', null),  -- entertainment
  ('08511751-0767-480b-8538-9ab98cebd360'::uuid, 'uncountable', null),  -- enthusiasm
  ('d1c34d0d-d867-4e34-a318-c78cf73a8354'::uuid, 'countable', 'entrances'),  -- entrance
  ('7a0c0f44-114c-425f-9161-d7c32bf56b16'::uuid, 'countable', 'entrance ceremonies'),  -- entrance ceremony
  ('aedacfa6-7314-4632-a70b-4f3f877b202c'::uuid, 'countable', 'entries'),  -- entry
  ('f7480ed8-a82b-4c53-9ca2-71f17ca57dd1'::uuid, 'countable', 'envelopes'),  -- envelope
  ('1eca004c-0882-443a-8e4b-7c0d3567f48d'::uuid, 'countable', 'environments'),  -- environment
  ('1f22c55a-ce4c-433b-9f12-49018ab2c3e2'::uuid, 'countable', 'environmentalists'),  -- environmentalist
  ('1a9918ce-cc3e-42d8-a055-bbbd69ca5761'::uuid, 'countable', 'episodes'),  -- episode
  ('a5bd2e40-e2e9-41f2-9574-9a11c22b1a20'::uuid, 'uncountable', null),  -- equality
  ('53a94898-3c69-425a-bf9b-c4bbf303e14d'::uuid, 'uncountable', null),  -- equipment
  ('ca6e3d4c-83cd-4f00-9e44-ca320717ef25'::uuid, 'countable', 'eras'),  -- era
  ('d5fb69bc-2670-445a-9752-16828fd78797'::uuid, 'countable', 'erasers'),  -- eraser
  ('d8b7fe0f-6351-4a50-8dfb-dca6dd66e203'::uuid, 'countable', 'errors'),  -- error
  ('f5ce9aa3-37d5-4eb2-89b5-5b427354f582'::uuid, 'countable', 'escalators'),  -- escalator
  ('076d0704-c69c-4091-9ead-87f5ba4b8ea8'::uuid, 'countable', 'essays'),  -- essay
  ('3cae4c81-774e-4e45-bb27-8e6a0b952320'::uuid, 'both', 'essences'),  -- essence
  ('833cab15-94e9-4e4f-b4e5-deab197289dd'::uuid, 'uncountable', null),  -- eternity
  ('f7f1a018-4173-4aa5-8bfc-d2e281d74627'::uuid, 'countable', 'euros'),  -- euro
  ('870047d3-f33d-4668-984c-e7d921352afc'::uuid, 'countable', 'evenings'),  -- evening
  ('0b5ce6fb-e66a-4d13-b3a9-61f04987c179'::uuid, 'countable', 'events'),  -- event
  ('0a685bf3-72f0-4f9e-ad42-05e3f3490869'::uuid, 'uncountable', null),  -- evidence
  ('758e5e35-a23e-4b13-a239-cb77c307ecbf'::uuid, 'countable', 'exams'),  -- exam
  ('ce6dbf8e-609c-4217-be26-d9917da90665'::uuid, 'countable', 'examinations'),  -- examination
  ('5dde2947-9103-4511-acb0-98dac0caae18'::uuid, 'countable', 'examples'),  -- example
  ('b57387f8-91bb-47c9-a91b-5329f5272969'::uuid, 'uncountable', null),  -- excellence
  ('3228d4d1-b021-4a70-92f8-92d51ac011b4'::uuid, 'countable', 'exceptions'),  -- exception
  ('ffd9e0e6-6333-49c7-8024-13f588bb76de'::uuid, 'countable', 'exchanges'),  -- exchange
  ('14a8f2f8-a9fa-404d-9ef0-52a5339212b9'::uuid, 'countable', 'exchange rates'),  -- exchange rate
  ('429a9ca2-b23d-4c42-b66c-2c83b9d8db2a'::uuid, 'uncountable', null),  -- excitement
  ('a6c4a749-4d32-4488-9cfd-283791ddbc7a'::uuid, 'countable', 'exhibitions'),  -- exhibition
  ('b22a94f0-8437-4148-b1cf-170f3954fcda'::uuid, 'uncountable', null),  -- existence
  ('8195b5e9-bfa7-4156-92f4-53a29188d7ae'::uuid, 'countable', 'exits'),  -- exit
  ('19414634-312b-4ed4-85a9-46d1d477dd6e'::uuid, 'countable', 'expenses'),  -- expense
  ('3b9c95a1-35b9-41eb-a6b4-31394e87a1cc'::uuid, 'both', 'experiences'),  -- experience
  ('71ae1b08-7a03-4319-b401-d31cce84541f'::uuid, 'countable', 'experiments'),  -- experiment
  ('3301ed29-7f16-4f83-b654-245e7c5222d2'::uuid, 'countable', 'experts'),  -- expert
  ('6a9a4aaa-9243-4fb3-a22d-4788d2ed9288'::uuid, 'countable', 'explanations'),  -- explanation
  ('851ce71c-af25-4931-8984-b7720bc0752f'::uuid, 'uncountable', null),  -- exploration
  ('c84aaefd-5604-45d5-a457-99145e6f6e28'::uuid, 'countable', 'explosions'),  -- explosion
  ('b8ad6851-126a-476b-953d-a8439b9cff10'::uuid, 'countable', 'expressions'),  -- expression
  ('b968ffd9-125e-4bb6-9af2-a12a45cfc703'::uuid, 'countable', 'extents'),  -- extent
  ('8fb4037c-6f29-4cf5-b886-68e9aa7ae363'::uuid, 'uncountable', null),  -- extinction
  ('daf67527-32d1-4d6f-bac0-de2e77722add'::uuid, 'countable', 'extinguishers'),  -- extinguisher
  ('d9ee374e-4c5d-4462-9569-b0b275bd6d02'::uuid, 'plural', null),  -- extreme sports
  ('1d200698-b5a0-4a26-9817-49f02f9e5e4c'::uuid, 'countable', 'eyes'),  -- eye
  ('caa513ab-ffef-4c30-b2d4-ee6fb7dd86db'::uuid, 'uncountable', null),  -- eyesight
  ('9cf88191-54d4-4064-9142-686fd93782e6'::uuid, 'countable', 'faces'),  -- face
  ('252ae3ba-1b11-4cd3-b8ce-3057bcf0b3a1'::uuid, 'countable', 'facilities'),  -- facility
  ('d2868a71-2215-45ff-8690-51cdd56eb10c'::uuid, 'countable', 'facts'),  -- fact
  ('edd1b16a-aa25-4ea6-b414-fadee21dc6c2'::uuid, 'countable', 'factories'),  -- factory
  ('b934b6b4-5e80-4c7c-b5da-a9acf21f44d6'::uuid, 'countable', 'failures'),  -- failure
  ('a6465838-c53b-4ae8-a9ed-996e5582fb24'::uuid, 'countable', 'fairs'),  -- fair
  ('67a9fd91-f5ab-4f0c-983a-c2b581452a2a'::uuid, 'countable', 'fairies'),  -- fairy
  ('b753ab45-9d1b-41b4-b2ca-36b1ed2a38f2'::uuid, 'both', 'falls'),  -- fall
  ('582076e8-4336-447e-b685-867e7cbc6f14'::uuid, 'countable', 'families'),  -- family
  ('38cba95e-f5b8-4235-ba11-ea3f3606f5e7'::uuid, 'countable', 'fans'),  -- fan
  ('72694718-961b-4a56-8dc9-0d431169f41a'::uuid, 'countable', 'fantasies'),  -- fantasy
  ('c22bb6da-e4d9-4c3f-80c9-9b4a22fafe69'::uuid, 'countable', 'fares'),  -- fare
  ('9720bfaa-afa3-410b-85d9-422fcfcafbdc'::uuid, 'countable', 'farewells'),  -- farewell
  ('db10776a-e0a9-4ad6-bb51-ec571b69174d'::uuid, 'countable', 'farms'),  -- farm
  ('bdd3691f-edc0-4ba5-a883-2b1e230c0a66'::uuid, 'countable', 'farmers'),  -- farmer
  ('406afecc-a6c9-43b4-928f-c276617729bf'::uuid, 'uncountable', null),  -- farming
  ('4c504732-aea0-4640-b5b7-29bca31c76b4'::uuid, 'uncountable', null),  -- farmland
  ('310ba1d1-a882-47a3-9b70-9144e817b82b'::uuid, 'both', 'fashions'),  -- fashion
  ('239e5791-8a40-4c31-9f2d-3203339ec747'::uuid, 'countable', 'fasts'),  -- fast
  ('e86b2b35-9502-4d64-91cb-71b8192c55e1'::uuid, 'uncountable', null),  -- fast food
  ('eff10aa1-f577-456b-8624-baa7cbf870f8'::uuid, 'countable', 'fathers'),  -- father
  ('0c161f31-f9bb-4365-a14c-8da1b9474937'::uuid, 'countable', 'faults'),  -- fault
  ('918835b7-fd7d-47e7-976d-624d30db8113'::uuid, 'countable', 'favors'),  -- favor
  ('53bb5b13-2578-4426-afde-1883d6e4f22f'::uuid, 'both', 'fears'),  -- fear
  ('aaea44bb-01ab-4990-b9c6-c74c4002be94'::uuid, 'countable', 'feasts'),  -- feast
  ('e9e5d8a0-338c-4f22-b2fd-a70dab84260d'::uuid, 'countable', 'feathers'),  -- feather
  ('47aae854-8839-4dc7-b78d-fcf947777b93'::uuid, 'countable', 'features'),  -- feature
  ('bed11474-2478-4db7-ac31-108d1fed6854'::uuid, 'countable', 'fees'),  -- fee
  ('44ba12bc-1c4a-4bf3-87f3-7c406924b0ce'::uuid, 'uncountable', null),  -- feedback
  ('bb7a8df9-fec0-4ae7-9da4-badf5e1a7563'::uuid, 'countable', 'feelings'),  -- feeling
  ('6615414d-7e81-4260-9d73-2798bc785058'::uuid, 'countable', 'fences'),  -- fence
  ('81682a76-ea89-4631-845c-fd8d60048f3f'::uuid, 'countable', 'ferries'),  -- ferry
  ('b93f9795-7a20-4658-abc8-569d47c78041'::uuid, 'countable', 'festivals'),  -- festival
  ('05ad70a2-95c2-4406-992b-4db55abd5d15'::uuid, 'countable', 'fevers'),  -- fever
  ('f3bb792a-64bf-47be-a3ad-d3e880471a7f'::uuid, 'both', 'fibers'),  -- fiber
  ('e966a096-b464-4585-8325-225c0c59e39b'::uuid, 'uncountable', null),  -- fiction
  ('88a30c37-d954-4540-9fdf-a533b15844fe'::uuid, 'countable', 'fields'),  -- field
  ('db4c21a1-2550-4ab2-972e-694ea3a36887'::uuid, 'countable', 'field trips'),  -- field trip
  ('c16db4bf-33b4-4e5b-a124-78a21ff2c847'::uuid, 'countable', 'fights'),  -- fight
  ('e1ac59fc-0eda-45ec-b83b-2786376456a7'::uuid, 'countable', 'figures'),  -- figure
  ('807850a4-de7b-4753-8c32-d7b320647cb5'::uuid, 'countable', 'files'),  -- file
  ('9e678226-6fe6-49ce-b616-ceb784f622f5'::uuid, 'countable', 'fillings'),  -- filling
  ('60c4736c-5dad-4c66-bb4d-c2b197a6406a'::uuid, 'countable', 'films'),  -- film
  ('9f289a2e-2095-429c-8d55-707f346dbba9'::uuid, 'countable', 'filmmakers'),  -- filmmaker
  ('a1a0b850-6a14-4915-afc2-d9b62b3a20f5'::uuid, 'countable', 'filters'),  -- filter
  ('868fd73c-3278-46b7-aff0-4781cb1af298'::uuid, 'countable', 'fines'),  -- fine
  ('454e58a3-bcf7-4bdb-afbe-e44149f80edd'::uuid, 'countable', 'fingers'),  -- finger
  ('546e933d-617c-41e1-8648-da8206cae2e3'::uuid, 'both', 'fires'),  -- fire
  ('9c402673-1915-4da6-8dc4-a3b03a18c0b2'::uuid, 'countable', 'fire stations'),  -- fire station
  ('aa7473cf-13b0-414d-a2bc-fb2d1b858034'::uuid, 'countable', 'firefighters'),  -- firefighter
  ('92d597ab-ea6c-463a-ac53-86e448f593b1'::uuid, 'plural', null),  -- fireworks
  ('624e6d0b-af89-41f0-94cd-9d532e104940'::uuid, 'countable', 'firms'),  -- firm
  ('65ce2e82-9f22-493a-b654-632c509c44db'::uuid, 'countable', 'first floors'),  -- first floor
  ('f7b700eb-d0f9-456e-bf51-20fc14598a00'::uuid, 'countable', 'first names'),  -- first name
  ('bec3a72a-051a-49d4-a12c-bfbe4dd30774'::uuid, 'countable', 'fish'),  -- fish
  ('6848f002-35bd-4977-8005-4518ac53cb7d'::uuid, 'countable', 'fishermen'),  -- fisherman
  ('8e17f5c8-7c0e-4c1d-9da0-41edc762fb32'::uuid, 'uncountable', null),  -- fishing
  ('e29f123a-277b-47ed-af4e-bd14f447266d'::uuid, 'uncountable', null),  -- fitness
  ('f498a298-8469-461c-ac41-c38125d15abc'::uuid, 'countable', 'flags'),  -- flag
  ('6ff96933-d298-4bf4-b844-ce936cc09d82'::uuid, 'countable', 'flavors'),  -- flavor
  ('9e8867d0-53a2-497c-9c78-8809726f19e0'::uuid, 'countable', 'fleas'),  -- flea
  ('2793f3d9-313b-4734-abf1-274c001a69ac'::uuid, 'countable', 'flights'),  -- flight
  ('ec901296-fb6c-4f38-bf43-e98f56713ab4'::uuid, 'countable', 'flight attendants'),  -- flight attendant
  ('bedf9435-dd19-416f-a086-a12b2cf5bc17'::uuid, 'countable', 'flocks'),  -- flock
  ('a3ad7685-297f-443b-9834-2dbc0fa6775d'::uuid, 'countable', 'floods'),  -- flood
  ('e3638f25-da75-44c6-9a5e-68659ed64d25'::uuid, 'countable', 'floors'),  -- floor
  ('77356a63-0918-46c6-a186-f42f705485a6'::uuid, 'countable', 'florists'),  -- florist
  ('bfdd20c6-c6d6-443c-b103-b6ecb8e479e4'::uuid, 'uncountable', null),  -- flour
  ('07f577ce-c87c-442d-8b27-bc1f8054a012'::uuid, 'countable', 'flows'),  -- flow
  ('b20eded4-566c-4f77-bbae-a3be71268b0c'::uuid, 'countable', 'flowers'),  -- flower
  ('ff87eb51-2f21-4018-9542-3b7854bc07c3'::uuid, 'countable', 'flower shops'),  -- flower shop
  ('f8cb5e77-4a5d-40fa-9b1a-59b50d7be713'::uuid, 'uncountable', null),  -- flu
  ('5234cbee-0ca4-4b58-9d1d-c7a69cb92903'::uuid, 'countable', 'flutes'),  -- flute
  ('d2c43ab9-c764-4321-9825-0c5512fce4e7'::uuid, 'uncountable', null),  -- fog
  ('6d9a51fb-7888-4492-a900-224c292f04c5'::uuid, 'countable', 'folders'),  -- folder
  ('a57650e3-54ab-46f5-8d6f-12ce306cee2a'::uuid, 'countable', 'followers'),  -- follower
  ('f10fb44d-e570-4ea8-b103-855ec3a09303'::uuid, 'both', 'foods'),  -- food
  ('1cb28269-778a-406d-a6c5-c974193dc57e'::uuid, 'uncountable', null),  -- food poisoning
  ('b94b0978-4ca8-4e65-bc41-e9b0e66390e6'::uuid, 'countable', 'fools'),  -- fool
  ('2951bac1-9072-438f-8f59-45310e8764bc'::uuid, 'countable', 'feet'),  -- foot
  ('77b4ef5c-e357-447b-87aa-115c2d08b45e'::uuid, 'uncountable', null),  -- football
  ('a8bb6577-b355-43d9-b82f-f9459573de5f'::uuid, 'both', 'forces'),  -- force
  ('a9ba738f-6f26-4e9f-a587-8fd392dbca75'::uuid, 'countable', 'forecasts'),  -- forecast
  ('036aa189-47fe-4631-aed4-656734f9b339'::uuid, 'countable', 'foreheads'),  -- forehead
  ('e56a8287-9d4f-48e3-bb5e-60595eecfc6c'::uuid, 'countable', 'foreigners'),  -- foreigner
  ('15ec74d8-ca9a-437b-bb7c-5d939ef0aad4'::uuid, 'countable', 'forests'),  -- forest
  ('01fc60a1-f131-47f8-a0b8-9988b9a7192d'::uuid, 'countable', 'forks'),  -- fork
  ('d91c1fc3-6f74-4307-b04e-3fdab36ca3bd'::uuid, 'countable', 'forms'),  -- form
  ('159f3e3f-9a76-46ac-8117-d269ab408428'::uuid, 'countable', 'formats'),  -- format
  ('bc536f9f-bf6a-424b-b6ff-ff01581ab87d'::uuid, 'countable', 'formulas'),  -- formula
  ('485ca802-4cc2-4d7f-a22f-c44f6a4aae6d'::uuid, 'both', 'fortunes'),  -- fortune
  ('64eaf21f-7af9-41bf-a22a-7e6cdbb72826'::uuid, 'countable', 'fortune slips'),  -- fortune slip
  ('7381f39d-f0df-4b2d-acd6-f9a3b6acea2c'::uuid, 'countable', 'foundations'),  -- foundation
  ('d06302fc-1be7-4460-9078-bb8b9edb0d2e'::uuid, 'countable', 'fountains'),  -- fountain
  ('1b626e64-5947-4fce-a25a-f041fcf44a96'::uuid, 'countable', 'foxes'),  -- fox
  ('11023e64-97dc-453b-a95d-7938b7aea655'::uuid, 'countable', 'frames'),  -- frame
  ('4d559251-aba1-4a03-b13a-5cf2f332dd45'::uuid, 'uncountable', null),  -- freedom
  ('f48e95b7-b3c5-4715-aebc-ceabd1bf3fc1'::uuid, 'countable', 'freezers'),  -- freezer
  ('f5c2e217-9850-44bd-8f4e-3d79eea6d85f'::uuid, 'plural', null),  -- French fries
  ('4a4654de-fa0b-4864-a832-22d37899cd06'::uuid, 'countable', 'frequencies'),  -- frequency
  ('26ad78e3-ecd4-4b36-b19c-24c130c0af08'::uuid, 'countable', 'freshmen'),  -- freshman
  ('48eb4c51-bbd9-49bb-8af9-0f0c1a7dae2b'::uuid, 'uncountable', null),  -- fried chicken
  ('ff133c07-9321-4463-8665-4c355bf52d94'::uuid, 'countable', 'friends'),  -- friend
  ('e54d4f20-01ea-4997-9fcd-21c3023af7ed'::uuid, 'both', 'friendships'),  -- friendship
  ('18e1b588-8bce-4634-adcc-4056acc1e9ff'::uuid, 'countable', 'frogs'),  -- frog
  ('fb496bc0-1c37-4821-ab7a-5a9ecb6d68b1'::uuid, 'uncountable', null),  -- frost
  ('684a75ee-2b50-4304-95e9-b85e73101994'::uuid, 'both', 'fruits'),  -- fruit
  ('de8ade35-1db4-4a96-b9ac-57a0a747a638'::uuid, 'both', 'frustrations'),  -- frustration
  ('517e1d45-a56f-4d9c-9319-dc5d0787e728'::uuid, 'countable', 'frying pans'),  -- frying pan
  ('124788f2-89e5-400b-b6f9-53bf3716af58'::uuid, 'both', 'fuels'),  -- fuel
  ('897cafd6-4156-4422-bcae-bedbe73932fe'::uuid, 'uncountable', null),  -- fun
  ('c7c6f109-d040-4b73-a35a-6591f1314fd3'::uuid, 'countable', 'functions'),  -- function
  ('7e4d31a5-0962-459d-989f-ca976eda80d1'::uuid, 'countable', 'funds'),  -- fund
  ('2252b8e1-4844-4e07-8bc4-cf1bb8b64e4a'::uuid, 'countable', 'funerals'),  -- funeral
  ('d702d4d5-5d3e-4e93-b3dd-7bc80bed926e'::uuid, 'both', 'furs'),  -- fur
  ('858fa275-bff5-43b0-8c49-245dba075c52'::uuid, 'uncountable', null),  -- furniture
  ('669fe47c-8db3-4648-b333-913c4f0bf1e4'::uuid, 'countable', 'fusses'),  -- fuss
  ('3b4ebbea-d1a4-4ff7-873e-a07500f78b1e'::uuid, 'both', 'futures'),  -- future
  ('58599067-06b1-4346-b72a-69f897891cc5'::uuid, 'countable', 'galleries'),  -- gallery
  ('397f26b0-88e8-496a-86a2-20b82f697eba'::uuid, 'countable', 'gallons'),  -- gallon
  ('00e24003-d09d-4738-9497-fa2471438460'::uuid, 'countable', 'games'),  -- game
  ('497f68a4-f27c-48f9-aace-0fe3297295df'::uuid, 'countable', 'game creators'),  -- game creator
  ('74d95194-c2f3-4489-9855-cfbe658b37f8'::uuid, 'countable', 'gaps'),  -- gap
  ('afaa2b1f-7583-45f7-b1b0-9a2a68ff641d'::uuid, 'countable', 'garages'),  -- garage
  ('0414b0e3-8960-49ce-9c5f-adca63fa1353'::uuid, 'uncountable', null),  -- garbage
  ('c6202623-1bd9-4ac4-9123-e8964a509559'::uuid, 'countable', 'gardens'),  -- garden
  ('a5470567-7a75-4447-89c8-0a0247d01412'::uuid, 'uncountable', null),  -- gardening
  ('600ee630-9e0b-4ba6-8a12-6fca7d024bb5'::uuid, 'uncountable', null),  -- garlic
  ('8ee09d14-b4a2-43e3-a558-9b76abba315a'::uuid, 'both', 'gases'),  -- gas
  ('33018b8d-8e23-4f6f-9f24-1bc140c33a58'::uuid, 'countable', 'gates'),  -- gate
  ('fa8286ba-9459-4dc6-924c-32053339ab0d'::uuid, 'both', 'genders'),  -- gender
  ('73319938-373b-4d6f-9504-c411f8d40e1f'::uuid, 'countable', 'genes'),  -- gene
  ('0096d609-d630-425d-b6d1-e11ba556b689'::uuid, 'countable', 'generations'),  -- generation
  ('c919b292-23f5-4f3c-b87c-08b7860f941e'::uuid, 'uncountable', null),  -- genetics
  ('aaa27ce8-7784-44e6-93b6-09a9c6052db8'::uuid, 'countable', 'genres'),  -- genre
  ('dd31789d-cf4e-4954-8440-9faebdf08d03'::uuid, 'countable', 'gentlemen'),  -- gentleman
  ('0ebb7262-7d03-4d15-b6ef-6abdeb4c856b'::uuid, 'uncountable', null),  -- geography
  ('0d3c891d-ec21-4065-b68c-71d9e9c7bc32'::uuid, 'uncountable', null),  -- geology
  ('4a72c9cb-b2db-4757-be05-435dc4f36c40'::uuid, 'countable', 'gestures'),  -- gesture
  ('39e6a6d9-0cc2-4c62-8d42-0227f3d6487e'::uuid, 'countable', 'ghosts'),  -- ghost
  ('b4357cf8-3bf8-4207-aae7-9f4e881f2766'::uuid, 'countable', 'gifts'),  -- gift
  ('f90245aa-6568-4d80-b6f7-158d3fc478aa'::uuid, 'countable', 'gingers'),  -- ginger
  ('0136a6bb-9f86-4647-95fc-906ce2c5a0bd'::uuid, 'countable', 'giraffes'),  -- giraffe
  ('14f3c7ff-9059-4912-8e1c-796d0c897a29'::uuid, 'countable', 'girls'),  -- girl
  ('697f5be0-cb4a-4ce1-917a-3bb9bcd5a200'::uuid, 'countable', 'girlfriends'),  -- girlfriend
  ('637fb4a6-7905-4b20-ad7f-dfb8b2f759e0'::uuid, 'countable', 'glaciers'),  -- glacier
  ('9ff0c9a7-eb57-447d-8e8b-c4da49453de1'::uuid, 'both', 'glasses'),  -- glass
  ('af614e1f-74d6-4779-b14b-2079c9431fa3'::uuid, 'plural', null),  -- glasses
  ('0d4d1a75-a50a-4a5d-8b22-2538a6630260'::uuid, 'countable', 'glimpses'),  -- glimpse
  ('7b1ad961-23fd-4cf7-a414-b22df7b4101f'::uuid, 'uncountable', null),  -- global warming
  ('d201d662-a0b1-40b9-b325-5090334f2bee'::uuid, 'countable', 'globes'),  -- globe
  ('623a1972-f17a-4dd4-b59d-d2717415c8a4'::uuid, 'uncountable', null),  -- glory
  ('d46c35bb-7369-4551-961e-42266aa5a447'::uuid, 'plural', null),  -- gloves
  ('6092358d-67dd-48c0-99ec-bb3f9c4f731a'::uuid, 'uncountable', null),  -- glue
  ('f38f407c-6056-4034-8317-b7b1e577ca6b'::uuid, 'countable', 'goals'),  -- goal
  ('f035200f-e115-4458-97e9-c6cd8511e1ed'::uuid, 'countable', 'goalkeepers'),  -- goalkeeper
  ('281f82e5-f1ef-416d-a181-634bd7ff9738'::uuid, 'countable', 'gods'),  -- god
  ('2b924701-ce25-406a-a4dc-b773ee05c662'::uuid, 'countable', 'goddesses'),  -- goddess
  ('43c84648-193b-4efb-a0ed-81e8edef0fc7'::uuid, 'uncountable', null),  -- gold
  ('d940bb58-d83c-4488-852a-c048d385e1a7'::uuid, 'uncountable', null),  -- golf
  ('c3b2d30d-23c0-42ab-889f-3cb354c99b70'::uuid, 'countable', 'golfers'),  -- golfer
  ('648f9d0b-f663-4389-ba39-22015c9ca85d'::uuid, 'plural', null),  -- goods
  ('c63cdb59-e4a9-4f84-9438-cac5a77c23f0'::uuid, 'countable', 'gorillas'),  -- gorilla
  ('c98bd4e6-d504-4b44-87a6-4a65583a9529'::uuid, 'uncountable', null),  -- gossip
  ('512ffa41-fabd-425e-b908-dc1a067cdcf1'::uuid, 'countable', 'governments'),  -- government
  ('e7ae75fe-2ef7-4bf7-83ac-14fe2b931daa'::uuid, 'countable', 'governors'),  -- governor
  ('5bb2c3d3-e56b-4d69-a7f4-f0939c49323d'::uuid, 'countable', 'grades'),  -- grade
  ('5d46a66a-5a67-43fb-8811-1dd58eb0f9de'::uuid, 'countable', 'graduations'),  -- graduation
  ('9e48836c-0899-4f64-b139-5526d75099bf'::uuid, 'countable', 'graduation ceremonies'),  -- graduation ceremony
  ('140f9fdc-86db-4f01-b8ae-6e0c76e11f51'::uuid, 'countable', 'grams'),  -- gram
  ('c50b0814-fdc8-4c50-87c9-e97c00e90001'::uuid, 'uncountable', null),  -- grammar
  ('05ec304d-1e89-49fc-a666-1154a112e71c'::uuid, 'countable', 'grandchildren'),  -- grandchild
  ('94a2718e-6ea3-43dc-a7a1-21583e41d696'::uuid, 'countable', 'granddaughters'),  -- granddaughter
  ('26e3ea3b-0c51-4f43-afdd-fd54a30c3d05'::uuid, 'countable', 'grandfathers'),  -- grandfather
  ('5d07b642-c79b-448b-9013-4041fd215a33'::uuid, 'countable', 'grandmas'),  -- grandma
  ('f4bae282-624a-4531-90ef-c9ed6c5256db'::uuid, 'countable', 'grandmothers'),  -- grandmother
  ('3f689a2d-135f-4b39-ae8f-13cb5e3ad57a'::uuid, 'countable', 'grandpas'),  -- grandpa
  ('32fae725-0391-44e5-8cd3-f7d03bfd90fd'::uuid, 'countable', 'grandparents'),  -- grandparent
  ('debc7f96-1a71-43a1-a488-23853aea5aa2'::uuid, 'countable', 'grandsons'),  -- grandson
  ('b8b44600-a54a-444b-bf43-418af8f2cffe'::uuid, 'countable', 'grants'),  -- grant
  ('4a5a343a-74ac-40ea-bde5-ea2389341958'::uuid, 'countable', 'grapes'),  -- grape
  ('c7202e36-d684-4b8a-a0ad-c81374a28581'::uuid, 'countable', 'graphs'),  -- graph
  ('271f5ff6-5c81-4627-8c7e-a986778a63be'::uuid, 'countable', 'graphic designers'),  -- graphic designer
  ('d99cca1c-cb60-44ef-a920-396dacea6804'::uuid, 'plural', null),  -- graphics
  ('dfc4fa24-308f-44d7-97b1-a6cbd401f0b8'::uuid, 'both', 'grasses'),  -- grass
  ('f8dff3d2-5b5c-49d4-82a0-88f527a70be8'::uuid, 'uncountable', null),  -- gratitude
  ('43b003d1-a851-4d47-a5dd-7301840aaf4c'::uuid, 'countable', 'graves'),  -- grave
  ('f04d3aec-65b3-4c0c-a394-5767867b2426'::uuid, 'countable', 'green peppers'),  -- green pepper
  ('a6b9e35d-cb59-4273-8f65-1fa0f042d63d'::uuid, 'uncountable', null),  -- green tea
  ('a5ea1c88-022d-451f-b16a-5880f0c220e0'::uuid, 'countable', 'greenhouses'),  -- greenhouse
  ('21bc1816-b33f-4ed0-9417-acdc59174e43'::uuid, 'countable', 'greetings'),  -- greeting
  ('1be27871-d5ad-48b4-8af0-bcc0019d3e7b'::uuid, 'countable', 'grocery stores'),  -- grocery store
  ('5a293ddc-1c6f-4a0c-9b23-a5bb25c8f167'::uuid, 'countable', 'grooms'),  -- groom
  ('724d1202-88a1-4938-a926-8afc098d665a'::uuid, 'countable', 'grounds'),  -- ground
  ('8637e476-d715-40b2-b2f8-9a9c8dc8aa0a'::uuid, 'countable', 'groups'),  -- group
  ('91ddb3df-0a72-4da4-a70b-374d2262d735'::uuid, 'uncountable', null),  -- growth
  ('4607ee63-1f7b-49f5-807c-faa71f816e67'::uuid, 'countable', 'guarantees'),  -- guarantee
  ('b3230afb-2d95-4607-96a9-2504816d75ec'::uuid, 'countable', 'guards'),  -- guard
  ('9da1c4a0-f40a-4fba-92e0-5366974dc4b2'::uuid, 'countable', 'guests'),  -- guest
  ('14792645-2c24-4a42-a112-2f220987f1e2'::uuid, 'uncountable', null),  -- guidance
  ('5fbf3889-901d-43dd-91c1-8b900633160f'::uuid, 'countable', 'guides'),  -- guide
  ('6c55f786-541e-45a5-9943-036774af7efe'::uuid, 'countable', 'guidebooks'),  -- guidebook
  ('434ddb95-3158-4d2b-9f6c-727081234ec8'::uuid, 'uncountable', null),  -- guilt
  ('dad587eb-b3ac-4c6c-a157-d3767d8d62ff'::uuid, 'countable', 'guitars'),  -- guitar
  ('201977ee-fa82-44c0-8182-3145bef3f81b'::uuid, 'countable', 'guitarists'),  -- guitarist
  ('c50ab036-aee6-4419-9b01-a49f32598be7'::uuid, 'countable', 'guns'),  -- gun
  ('3b5d6f57-c09e-4025-8599-15a1c90cd2ff'::uuid, 'countable', 'guys'),  -- guy
  ('bcebd0af-893f-43fb-9ae5-78e77ad20bfb'::uuid, 'countable', 'gyms'),  -- gym
  ('f43f9586-b3a6-4a73-aa73-e3f05243c82e'::uuid, 'uncountable', null),  -- gymnastics
  ('6d24ca79-f6fa-40ed-b483-477c06862b3e'::uuid, 'countable', 'habits'),  -- habit
  ('688e9e6b-dd39-4469-8758-ef0c524bd1a3'::uuid, 'countable', 'habitats'),  -- habitat
  ('337d4081-c5d3-4928-b380-1e3e6e1f32ab'::uuid, 'both', 'hairs'),  -- hair
  ('5ca8e2fe-8c74-4013-9cf0-088ba1aef156'::uuid, 'countable', 'haircuts'),  -- haircut
  ('6c2fd4ea-5588-40ac-a646-eb2c76b16274'::uuid, 'countable', 'hairdressers'),  -- hairdresser
  ('33dd19a8-ce9b-4d8d-ba8e-934c0e8fb1eb'::uuid, 'countable', 'hairdryers'),  -- hairdryer
  ('75b3ab59-efbc-4edd-a07f-6c7c6acba006'::uuid, 'countable', 'halves'),  -- half
  ('e35d4166-a45c-499d-a6f0-75f9d49bac5f'::uuid, 'countable', 'halls'),  -- hall
  ('f52a6e3e-4d9d-42e9-ad3d-872b34ab6051'::uuid, 'countable', 'hallways'),  -- hallway
  ('ab7671f7-56db-412d-9e27-c9585d517c79'::uuid, 'uncountable', null),  -- ham
  ('94e3d80f-2713-4e32-9069-cf4772fd88a4'::uuid, 'countable', 'hamburgers'),  -- hamburger
  ('d8972b5c-b523-4d61-927c-b131d74ea503'::uuid, 'countable', 'hammers'),  -- hammer
  ('ee2a309d-ab23-41cb-865d-a4b550f6f28c'::uuid, 'countable', 'hands'),  -- hand
  ('17927137-9d66-4c47-aca3-f697c1e0f12a'::uuid, 'countable', 'handbags'),  -- handbag
  ('84accd86-da9f-49ed-a02e-254ef3587221'::uuid, 'uncountable', null),  -- handball
  ('88700de3-9563-4199-a4ac-2e26cd8f7276'::uuid, 'countable', 'handkerchiefs'),  -- handkerchief
  ('1604fba4-2f7d-4ef3-b795-7494cd3c17e7'::uuid, 'countable', 'handshakes'),  -- handshake
  ('98c88b75-24d0-4ad0-af68-b3dc078c61cb'::uuid, 'uncountable', null),  -- handwriting
  ('b34a40ef-e163-41ee-8bee-582e1b189430'::uuid, 'uncountable', null),  -- happiness
  ('3fd5537e-7c51-486f-81aa-e9f9ec07065b'::uuid, 'countable', 'harbors'),  -- harbor
  ('a9db7a4a-264a-4a06-b923-5d998b21dba0'::uuid, 'both', 'hardships'),  -- hardship
  ('56e7cc7b-95c6-4b98-a58f-70c661bdd386'::uuid, 'uncountable', null),  -- harm
  ('fae9ca61-b7f6-4ef0-9f06-3e1ca386167f'::uuid, 'both', 'harmonies'),  -- harmony
  ('f016b4f4-bfb6-41b1-abf4-f1c75accea6a'::uuid, 'countable', 'hats'),  -- hat
  ('d89b021d-d3fc-4bcb-ae19-e0c844024aeb'::uuid, 'uncountable', null),  -- hatred
  ('849aa01e-fb34-4d70-8378-323f17c178c3'::uuid, 'countable', 'hazards'),  -- hazard
  ('58fdb27b-c4cf-4194-a3fe-254319521920'::uuid, 'countable', 'heads'),  -- head
  ('af5b8fe9-c034-4b55-8b30-09d506b5b053'::uuid, 'countable', 'headaches'),  -- headache
  ('cc3045db-ead3-483c-bc54-a91656aab4d8'::uuid, 'countable', 'headlines'),  -- headline
  ('442d330f-9187-46e5-9c38-3acdf0828e9e'::uuid, 'plural', null),  -- headphones
  ('22d19f04-9ae1-44e3-9565-b32e85624d5d'::uuid, 'uncountable', null),  -- health
  ('17e430a1-1665-4821-8098-2210a33c87c6'::uuid, 'both', 'hearings'),  -- hearing
  ('92af1698-7db5-454e-b591-24bd56e9649b'::uuid, 'countable', 'hearts'),  -- heart
  ('4a69e8ce-3dc3-42a1-9289-2e29c8752d82'::uuid, 'countable', 'heart attacks'),  -- heart attack
  ('ef813caa-7ef9-40d4-941c-dc7783f67632'::uuid, 'uncountable', null),  -- heat
  ('df264092-9597-428d-9eb5-0692a38e8259'::uuid, 'countable', 'heaters'),  -- heater
  ('9258c0ac-13b0-404a-8437-45d519b1632d'::uuid, 'uncountable', null),  -- heating
  ('b3a509b4-15e3-43bf-903c-2eb98922e98a'::uuid, 'countable', 'heels'),  -- heel
  ('d9e226e4-913b-49a1-a858-44b3a1945eb8'::uuid, 'countable', 'heights'),  -- height
  ('717505d9-e1d3-47bf-bdda-74d14a04106a'::uuid, 'countable', 'helmets'),  -- helmet
  ('1fb4402d-d1da-4f53-aca7-f4e08111a121'::uuid, 'countable', 'herbs'),  -- herb
  ('96f27f77-fbbc-4aee-ad3b-a5a082bd92e0'::uuid, 'countable', 'herds'),  -- herd
  ('a57e18e0-51e9-4e7e-b983-221e1b1673fd'::uuid, 'uncountable', null),  -- heritage
  ('969e9b7e-c251-4683-9d0a-d9234f56e944'::uuid, 'countable', 'heroes'),  -- hero
  ('6faad50a-7507-4ded-9400-918fad05ba90'::uuid, 'countable', 'high schools'),  -- high school
  ('e1d384e3-9c01-40f0-af95-4a178b17e98e'::uuid, 'countable', 'highways'),  -- highway
  ('d7880533-75c9-46ad-a048-0b0f7dacc4db'::uuid, 'uncountable', null)  -- hiking
) as v(id, countable, plural)
where w.id = v.id and w.countable is null and w.plural is null;

-- Check (words_in_batch and with_countable should both be 340):
select count(*) as words_in_batch, count(countable) as with_countable, count(plural) as with_plural from public.words where id in ('cff6ed93-b7af-4edc-bd42-144606113d64'::uuid, 'aae444bf-305a-42e9-94dd-c359e02470d0'::uuid, '83b744f9-d5ce-41ad-a13c-c714601dcd61'::uuid, '17338b69-385e-454d-9bf8-d93a7c8e51f3'::uuid, '7ab9b9ac-87b6-4635-aaf8-198f49bc43ff'::uuid, '46c2e9ae-40d1-4d00-a8ba-b0ce1c33bc47'::uuid, '599e0c0e-d068-48f0-8503-04e6788e9d89'::uuid, '03a873bf-080b-41a4-9f3e-25309e8aa595'::uuid, '56bd7c6e-6b91-419c-939d-88c2546955ad'::uuid, 'f3dc079e-8766-4aa6-bf51-c15efa0c0b8a'::uuid, '33059e1b-a219-4263-bf80-0fad36f81fc8'::uuid, '4284ef6d-7f1f-4023-b43b-2f5266da0710'::uuid, 'da4e627a-e72f-408e-8368-e69ae0543fbe'::uuid, '16a49b3e-00d8-4ee4-8ef4-6a42c295aaaf'::uuid, '8c02c562-4646-4d3e-93ff-455f20bdea01'::uuid, '8e4e7344-a24f-41d2-8b24-0e3d4bdc7f74'::uuid, '7201115d-85ea-4fce-bc53-ab48066f4273'::uuid, 'df696419-6c56-44a4-88a4-e851b6b4782f'::uuid, '1083d88f-7007-4dea-94ca-33979b923744'::uuid, '05c85aed-d56a-43f7-b8d9-3b9c39b2df83'::uuid, '606de167-db83-4f19-8141-9e50a2eb8403'::uuid, '5bb5842d-bb40-49e3-bbed-cfad9dcb6fea'::uuid, '6e059f5a-d43f-4990-b1cc-927223560e59'::uuid, 'bb250bf0-7da9-409f-a4c9-ea3f5f5e494f'::uuid, 'db160fdb-f376-48b1-9b6a-57ac68463347'::uuid, '3e03b697-e37a-4463-b25d-6ed003710a8b'::uuid, 'd3e255f2-6ed4-4b24-b76e-f4dd38ef4dd1'::uuid, 'b1efa94c-c2ae-46e4-8908-6cc37626cac2'::uuid, 'dc28ed72-ec1e-4694-af4a-b1835e5d6000'::uuid, '3330eca8-6dde-40df-a456-e57793819923'::uuid, 'b15a3692-d3a4-4bfe-93e9-150f54b655b6'::uuid, '74f3170b-2566-4ab5-9ee7-6c94cd2d3b8e'::uuid, 'f94e4dc0-c249-4bc6-8889-e4bf4282d689'::uuid, 'ff3c2dc0-06e5-418a-905b-67d3b9b25508'::uuid, 'c06aca5a-7ac8-47ff-afd1-ab65f0a57829'::uuid, 'dacd7553-7464-45bc-9c8e-4ef1ee235fad'::uuid, 'db8309ee-a981-4930-b342-86cd91ccd114'::uuid, 'fcf2c1c2-553c-43b0-b17a-1dc5ad8a142b'::uuid, '08511751-0767-480b-8538-9ab98cebd360'::uuid, 'd1c34d0d-d867-4e34-a318-c78cf73a8354'::uuid, '7a0c0f44-114c-425f-9161-d7c32bf56b16'::uuid, 'aedacfa6-7314-4632-a70b-4f3f877b202c'::uuid, 'f7480ed8-a82b-4c53-9ca2-71f17ca57dd1'::uuid, '1eca004c-0882-443a-8e4b-7c0d3567f48d'::uuid, '1f22c55a-ce4c-433b-9f12-49018ab2c3e2'::uuid, '1a9918ce-cc3e-42d8-a055-bbbd69ca5761'::uuid, 'a5bd2e40-e2e9-41f2-9574-9a11c22b1a20'::uuid, '53a94898-3c69-425a-bf9b-c4bbf303e14d'::uuid, 'ca6e3d4c-83cd-4f00-9e44-ca320717ef25'::uuid, 'd5fb69bc-2670-445a-9752-16828fd78797'::uuid, 'd8b7fe0f-6351-4a50-8dfb-dca6dd66e203'::uuid, 'f5ce9aa3-37d5-4eb2-89b5-5b427354f582'::uuid, '076d0704-c69c-4091-9ead-87f5ba4b8ea8'::uuid, '3cae4c81-774e-4e45-bb27-8e6a0b952320'::uuid, '833cab15-94e9-4e4f-b4e5-deab197289dd'::uuid, 'f7f1a018-4173-4aa5-8bfc-d2e281d74627'::uuid, '870047d3-f33d-4668-984c-e7d921352afc'::uuid, '0b5ce6fb-e66a-4d13-b3a9-61f04987c179'::uuid, '0a685bf3-72f0-4f9e-ad42-05e3f3490869'::uuid, '758e5e35-a23e-4b13-a239-cb77c307ecbf'::uuid, 'ce6dbf8e-609c-4217-be26-d9917da90665'::uuid, '5dde2947-9103-4511-acb0-98dac0caae18'::uuid, 'b57387f8-91bb-47c9-a91b-5329f5272969'::uuid, '3228d4d1-b021-4a70-92f8-92d51ac011b4'::uuid, 'ffd9e0e6-6333-49c7-8024-13f588bb76de'::uuid, '14a8f2f8-a9fa-404d-9ef0-52a5339212b9'::uuid, '429a9ca2-b23d-4c42-b66c-2c83b9d8db2a'::uuid, 'a6c4a749-4d32-4488-9cfd-283791ddbc7a'::uuid, 'b22a94f0-8437-4148-b1cf-170f3954fcda'::uuid, '8195b5e9-bfa7-4156-92f4-53a29188d7ae'::uuid, '19414634-312b-4ed4-85a9-46d1d477dd6e'::uuid, '3b9c95a1-35b9-41eb-a6b4-31394e87a1cc'::uuid, '71ae1b08-7a03-4319-b401-d31cce84541f'::uuid, '3301ed29-7f16-4f83-b654-245e7c5222d2'::uuid, '6a9a4aaa-9243-4fb3-a22d-4788d2ed9288'::uuid, '851ce71c-af25-4931-8984-b7720bc0752f'::uuid, 'c84aaefd-5604-45d5-a457-99145e6f6e28'::uuid, 'b8ad6851-126a-476b-953d-a8439b9cff10'::uuid, 'b968ffd9-125e-4bb6-9af2-a12a45cfc703'::uuid, '8fb4037c-6f29-4cf5-b886-68e9aa7ae363'::uuid, 'daf67527-32d1-4d6f-bac0-de2e77722add'::uuid, 'd9ee374e-4c5d-4462-9569-b0b275bd6d02'::uuid, '1d200698-b5a0-4a26-9817-49f02f9e5e4c'::uuid, 'caa513ab-ffef-4c30-b2d4-ee6fb7dd86db'::uuid, '9cf88191-54d4-4064-9142-686fd93782e6'::uuid, '252ae3ba-1b11-4cd3-b8ce-3057bcf0b3a1'::uuid, 'd2868a71-2215-45ff-8690-51cdd56eb10c'::uuid, 'edd1b16a-aa25-4ea6-b414-fadee21dc6c2'::uuid, 'b934b6b4-5e80-4c7c-b5da-a9acf21f44d6'::uuid, 'a6465838-c53b-4ae8-a9ed-996e5582fb24'::uuid, '67a9fd91-f5ab-4f0c-983a-c2b581452a2a'::uuid, 'b753ab45-9d1b-41b4-b2ca-36b1ed2a38f2'::uuid, '582076e8-4336-447e-b685-867e7cbc6f14'::uuid, '38cba95e-f5b8-4235-ba11-ea3f3606f5e7'::uuid, '72694718-961b-4a56-8dc9-0d431169f41a'::uuid, 'c22bb6da-e4d9-4c3f-80c9-9b4a22fafe69'::uuid, '9720bfaa-afa3-410b-85d9-422fcfcafbdc'::uuid, 'db10776a-e0a9-4ad6-bb51-ec571b69174d'::uuid, 'bdd3691f-edc0-4ba5-a883-2b1e230c0a66'::uuid, '406afecc-a6c9-43b4-928f-c276617729bf'::uuid, '4c504732-aea0-4640-b5b7-29bca31c76b4'::uuid, '310ba1d1-a882-47a3-9b70-9144e817b82b'::uuid, '239e5791-8a40-4c31-9f2d-3203339ec747'::uuid, 'e86b2b35-9502-4d64-91cb-71b8192c55e1'::uuid, 'eff10aa1-f577-456b-8624-baa7cbf870f8'::uuid, '0c161f31-f9bb-4365-a14c-8da1b9474937'::uuid, '918835b7-fd7d-47e7-976d-624d30db8113'::uuid, '53bb5b13-2578-4426-afde-1883d6e4f22f'::uuid, 'aaea44bb-01ab-4990-b9c6-c74c4002be94'::uuid, 'e9e5d8a0-338c-4f22-b2fd-a70dab84260d'::uuid, '47aae854-8839-4dc7-b78d-fcf947777b93'::uuid, 'bed11474-2478-4db7-ac31-108d1fed6854'::uuid, '44ba12bc-1c4a-4bf3-87f3-7c406924b0ce'::uuid, 'bb7a8df9-fec0-4ae7-9da4-badf5e1a7563'::uuid, '6615414d-7e81-4260-9d73-2798bc785058'::uuid, '81682a76-ea89-4631-845c-fd8d60048f3f'::uuid, 'b93f9795-7a20-4658-abc8-569d47c78041'::uuid, '05ad70a2-95c2-4406-992b-4db55abd5d15'::uuid, 'f3bb792a-64bf-47be-a3ad-d3e880471a7f'::uuid, 'e966a096-b464-4585-8325-225c0c59e39b'::uuid, '88a30c37-d954-4540-9fdf-a533b15844fe'::uuid, 'db4c21a1-2550-4ab2-972e-694ea3a36887'::uuid, 'c16db4bf-33b4-4e5b-a124-78a21ff2c847'::uuid, 'e1ac59fc-0eda-45ec-b83b-2786376456a7'::uuid, '807850a4-de7b-4753-8c32-d7b320647cb5'::uuid, '9e678226-6fe6-49ce-b616-ceb784f622f5'::uuid, '60c4736c-5dad-4c66-bb4d-c2b197a6406a'::uuid, '9f289a2e-2095-429c-8d55-707f346dbba9'::uuid, 'a1a0b850-6a14-4915-afc2-d9b62b3a20f5'::uuid, '868fd73c-3278-46b7-aff0-4781cb1af298'::uuid, '454e58a3-bcf7-4bdb-afbe-e44149f80edd'::uuid, '546e933d-617c-41e1-8648-da8206cae2e3'::uuid, '9c402673-1915-4da6-8dc4-a3b03a18c0b2'::uuid, 'aa7473cf-13b0-414d-a2bc-fb2d1b858034'::uuid, '92d597ab-ea6c-463a-ac53-86e448f593b1'::uuid, '624e6d0b-af89-41f0-94cd-9d532e104940'::uuid, '65ce2e82-9f22-493a-b654-632c509c44db'::uuid, 'f7b700eb-d0f9-456e-bf51-20fc14598a00'::uuid, 'bec3a72a-051a-49d4-a12c-bfbe4dd30774'::uuid, '6848f002-35bd-4977-8005-4518ac53cb7d'::uuid, '8e17f5c8-7c0e-4c1d-9da0-41edc762fb32'::uuid, 'e29f123a-277b-47ed-af4e-bd14f447266d'::uuid, 'f498a298-8469-461c-ac41-c38125d15abc'::uuid, '6ff96933-d298-4bf4-b844-ce936cc09d82'::uuid, '9e8867d0-53a2-497c-9c78-8809726f19e0'::uuid, '2793f3d9-313b-4734-abf1-274c001a69ac'::uuid, 'ec901296-fb6c-4f38-bf43-e98f56713ab4'::uuid, 'bedf9435-dd19-416f-a086-a12b2cf5bc17'::uuid, 'a3ad7685-297f-443b-9834-2dbc0fa6775d'::uuid, 'e3638f25-da75-44c6-9a5e-68659ed64d25'::uuid, '77356a63-0918-46c6-a186-f42f705485a6'::uuid, 'bfdd20c6-c6d6-443c-b103-b6ecb8e479e4'::uuid, '07f577ce-c87c-442d-8b27-bc1f8054a012'::uuid, 'b20eded4-566c-4f77-bbae-a3be71268b0c'::uuid, 'ff87eb51-2f21-4018-9542-3b7854bc07c3'::uuid, 'f8cb5e77-4a5d-40fa-9b1a-59b50d7be713'::uuid, '5234cbee-0ca4-4b58-9d1d-c7a69cb92903'::uuid, 'd2c43ab9-c764-4321-9825-0c5512fce4e7'::uuid, '6d9a51fb-7888-4492-a900-224c292f04c5'::uuid, 'a57650e3-54ab-46f5-8d6f-12ce306cee2a'::uuid, 'f10fb44d-e570-4ea8-b103-855ec3a09303'::uuid, '1cb28269-778a-406d-a6c5-c974193dc57e'::uuid, 'b94b0978-4ca8-4e65-bc41-e9b0e66390e6'::uuid, '2951bac1-9072-438f-8f59-45310e8764bc'::uuid, '77b4ef5c-e357-447b-87aa-115c2d08b45e'::uuid, 'a8bb6577-b355-43d9-b82f-f9459573de5f'::uuid, 'a9ba738f-6f26-4e9f-a587-8fd392dbca75'::uuid, '036aa189-47fe-4631-aed4-656734f9b339'::uuid, 'e56a8287-9d4f-48e3-bb5e-60595eecfc6c'::uuid, '15ec74d8-ca9a-437b-bb7c-5d939ef0aad4'::uuid, '01fc60a1-f131-47f8-a0b8-9988b9a7192d'::uuid, 'd91c1fc3-6f74-4307-b04e-3fdab36ca3bd'::uuid, '159f3e3f-9a76-46ac-8117-d269ab408428'::uuid, 'bc536f9f-bf6a-424b-b6ff-ff01581ab87d'::uuid, '485ca802-4cc2-4d7f-a22f-c44f6a4aae6d'::uuid, '64eaf21f-7af9-41bf-a22a-7e6cdbb72826'::uuid, '7381f39d-f0df-4b2d-acd6-f9a3b6acea2c'::uuid, 'd06302fc-1be7-4460-9078-bb8b9edb0d2e'::uuid, '1b626e64-5947-4fce-a25a-f041fcf44a96'::uuid, '11023e64-97dc-453b-a95d-7938b7aea655'::uuid, '4d559251-aba1-4a03-b13a-5cf2f332dd45'::uuid, 'f48e95b7-b3c5-4715-aebc-ceabd1bf3fc1'::uuid, 'f5c2e217-9850-44bd-8f4e-3d79eea6d85f'::uuid, '4a4654de-fa0b-4864-a832-22d37899cd06'::uuid, '26ad78e3-ecd4-4b36-b19c-24c130c0af08'::uuid, '48eb4c51-bbd9-49bb-8af9-0f0c1a7dae2b'::uuid, 'ff133c07-9321-4463-8665-4c355bf52d94'::uuid, 'e54d4f20-01ea-4997-9fcd-21c3023af7ed'::uuid, '18e1b588-8bce-4634-adcc-4056acc1e9ff'::uuid, 'fb496bc0-1c37-4821-ab7a-5a9ecb6d68b1'::uuid, '684a75ee-2b50-4304-95e9-b85e73101994'::uuid, 'de8ade35-1db4-4a96-b9ac-57a0a747a638'::uuid, '517e1d45-a56f-4d9c-9319-dc5d0787e728'::uuid, '124788f2-89e5-400b-b6f9-53bf3716af58'::uuid, '897cafd6-4156-4422-bcae-bedbe73932fe'::uuid, 'c7c6f109-d040-4b73-a35a-6591f1314fd3'::uuid, '7e4d31a5-0962-459d-989f-ca976eda80d1'::uuid, '2252b8e1-4844-4e07-8bc4-cf1bb8b64e4a'::uuid, 'd702d4d5-5d3e-4e93-b3dd-7bc80bed926e'::uuid, '858fa275-bff5-43b0-8c49-245dba075c52'::uuid, '669fe47c-8db3-4648-b333-913c4f0bf1e4'::uuid, '3b4ebbea-d1a4-4ff7-873e-a07500f78b1e'::uuid, '58599067-06b1-4346-b72a-69f897891cc5'::uuid, '397f26b0-88e8-496a-86a2-20b82f697eba'::uuid, '00e24003-d09d-4738-9497-fa2471438460'::uuid, '497f68a4-f27c-48f9-aace-0fe3297295df'::uuid, '74d95194-c2f3-4489-9855-cfbe658b37f8'::uuid, 'afaa2b1f-7583-45f7-b1b0-9a2a68ff641d'::uuid, '0414b0e3-8960-49ce-9c5f-adca63fa1353'::uuid, 'c6202623-1bd9-4ac4-9123-e8964a509559'::uuid, 'a5470567-7a75-4447-89c8-0a0247d01412'::uuid, '600ee630-9e0b-4ba6-8a12-6fca7d024bb5'::uuid, '8ee09d14-b4a2-43e3-a558-9b76abba315a'::uuid, '33018b8d-8e23-4f6f-9f24-1bc140c33a58'::uuid, 'fa8286ba-9459-4dc6-924c-32053339ab0d'::uuid, '73319938-373b-4d6f-9504-c411f8d40e1f'::uuid, '0096d609-d630-425d-b6d1-e11ba556b689'::uuid, 'c919b292-23f5-4f3c-b87c-08b7860f941e'::uuid, 'aaa27ce8-7784-44e6-93b6-09a9c6052db8'::uuid, 'dd31789d-cf4e-4954-8440-9faebdf08d03'::uuid, '0ebb7262-7d03-4d15-b6ef-6abdeb4c856b'::uuid, '0d3c891d-ec21-4065-b68c-71d9e9c7bc32'::uuid, '4a72c9cb-b2db-4757-be05-435dc4f36c40'::uuid, '39e6a6d9-0cc2-4c62-8d42-0227f3d6487e'::uuid, 'b4357cf8-3bf8-4207-aae7-9f4e881f2766'::uuid, 'f90245aa-6568-4d80-b6f7-158d3fc478aa'::uuid, '0136a6bb-9f86-4647-95fc-906ce2c5a0bd'::uuid, '14f3c7ff-9059-4912-8e1c-796d0c897a29'::uuid, '697f5be0-cb4a-4ce1-917a-3bb9bcd5a200'::uuid, '637fb4a6-7905-4b20-ad7f-dfb8b2f759e0'::uuid, '9ff0c9a7-eb57-447d-8e8b-c4da49453de1'::uuid, 'af614e1f-74d6-4779-b14b-2079c9431fa3'::uuid, '0d4d1a75-a50a-4a5d-8b22-2538a6630260'::uuid, '7b1ad961-23fd-4cf7-a414-b22df7b4101f'::uuid, 'd201d662-a0b1-40b9-b325-5090334f2bee'::uuid, '623a1972-f17a-4dd4-b59d-d2717415c8a4'::uuid, 'd46c35bb-7369-4551-961e-42266aa5a447'::uuid, '6092358d-67dd-48c0-99ec-bb3f9c4f731a'::uuid, 'f38f407c-6056-4034-8317-b7b1e577ca6b'::uuid, 'f035200f-e115-4458-97e9-c6cd8511e1ed'::uuid, '281f82e5-f1ef-416d-a181-634bd7ff9738'::uuid, '2b924701-ce25-406a-a4dc-b773ee05c662'::uuid, '43c84648-193b-4efb-a0ed-81e8edef0fc7'::uuid, 'd940bb58-d83c-4488-852a-c048d385e1a7'::uuid, 'c3b2d30d-23c0-42ab-889f-3cb354c99b70'::uuid, '648f9d0b-f663-4389-ba39-22015c9ca85d'::uuid, 'c63cdb59-e4a9-4f84-9438-cac5a77c23f0'::uuid, 'c98bd4e6-d504-4b44-87a6-4a65583a9529'::uuid, '512ffa41-fabd-425e-b908-dc1a067cdcf1'::uuid, 'e7ae75fe-2ef7-4bf7-83ac-14fe2b931daa'::uuid, '5bb2c3d3-e56b-4d69-a7f4-f0939c49323d'::uuid, '5d46a66a-5a67-43fb-8811-1dd58eb0f9de'::uuid, '9e48836c-0899-4f64-b139-5526d75099bf'::uuid, '140f9fdc-86db-4f01-b8ae-6e0c76e11f51'::uuid, 'c50b0814-fdc8-4c50-87c9-e97c00e90001'::uuid, '05ec304d-1e89-49fc-a666-1154a112e71c'::uuid, '94a2718e-6ea3-43dc-a7a1-21583e41d696'::uuid, '26e3ea3b-0c51-4f43-afdd-fd54a30c3d05'::uuid, '5d07b642-c79b-448b-9013-4041fd215a33'::uuid, 'f4bae282-624a-4531-90ef-c9ed6c5256db'::uuid, '3f689a2d-135f-4b39-ae8f-13cb5e3ad57a'::uuid, '32fae725-0391-44e5-8cd3-f7d03bfd90fd'::uuid, 'debc7f96-1a71-43a1-a488-23853aea5aa2'::uuid, 'b8b44600-a54a-444b-bf43-418af8f2cffe'::uuid, '4a5a343a-74ac-40ea-bde5-ea2389341958'::uuid, 'c7202e36-d684-4b8a-a0ad-c81374a28581'::uuid, '271f5ff6-5c81-4627-8c7e-a986778a63be'::uuid, 'd99cca1c-cb60-44ef-a920-396dacea6804'::uuid, 'dfc4fa24-308f-44d7-97b1-a6cbd401f0b8'::uuid, 'f8dff3d2-5b5c-49d4-82a0-88f527a70be8'::uuid, '43b003d1-a851-4d47-a5dd-7301840aaf4c'::uuid, 'f04d3aec-65b3-4c0c-a394-5767867b2426'::uuid, 'a6b9e35d-cb59-4273-8f65-1fa0f042d63d'::uuid, 'a5ea1c88-022d-451f-b16a-5880f0c220e0'::uuid, '21bc1816-b33f-4ed0-9417-acdc59174e43'::uuid, '1be27871-d5ad-48b4-8af0-bcc0019d3e7b'::uuid, '5a293ddc-1c6f-4a0c-9b23-a5bb25c8f167'::uuid, '724d1202-88a1-4938-a926-8afc098d665a'::uuid, '8637e476-d715-40b2-b2f8-9a9c8dc8aa0a'::uuid, '91ddb3df-0a72-4da4-a70b-374d2262d735'::uuid, '4607ee63-1f7b-49f5-807c-faa71f816e67'::uuid, 'b3230afb-2d95-4607-96a9-2504816d75ec'::uuid, '9da1c4a0-f40a-4fba-92e0-5366974dc4b2'::uuid, '14792645-2c24-4a42-a112-2f220987f1e2'::uuid, '5fbf3889-901d-43dd-91c1-8b900633160f'::uuid, '6c55f786-541e-45a5-9943-036774af7efe'::uuid, '434ddb95-3158-4d2b-9f6c-727081234ec8'::uuid, 'dad587eb-b3ac-4c6c-a157-d3767d8d62ff'::uuid, '201977ee-fa82-44c0-8182-3145bef3f81b'::uuid, 'c50ab036-aee6-4419-9b01-a49f32598be7'::uuid, '3b5d6f57-c09e-4025-8599-15a1c90cd2ff'::uuid, 'bcebd0af-893f-43fb-9ae5-78e77ad20bfb'::uuid, 'f43f9586-b3a6-4a73-aa73-e3f05243c82e'::uuid, '6d24ca79-f6fa-40ed-b483-477c06862b3e'::uuid, '688e9e6b-dd39-4469-8758-ef0c524bd1a3'::uuid, '337d4081-c5d3-4928-b380-1e3e6e1f32ab'::uuid, '5ca8e2fe-8c74-4013-9cf0-088ba1aef156'::uuid, '6c2fd4ea-5588-40ac-a646-eb2c76b16274'::uuid, '33dd19a8-ce9b-4d8d-ba8e-934c0e8fb1eb'::uuid, '75b3ab59-efbc-4edd-a07f-6c7c6acba006'::uuid, 'e35d4166-a45c-499d-a6f0-75f9d49bac5f'::uuid, 'f52a6e3e-4d9d-42e9-ad3d-872b34ab6051'::uuid, 'ab7671f7-56db-412d-9e27-c9585d517c79'::uuid, '94e3d80f-2713-4e32-9069-cf4772fd88a4'::uuid, 'd8972b5c-b523-4d61-927c-b131d74ea503'::uuid, 'ee2a309d-ab23-41cb-865d-a4b550f6f28c'::uuid, '17927137-9d66-4c47-aca3-f697c1e0f12a'::uuid, '84accd86-da9f-49ed-a02e-254ef3587221'::uuid, '88700de3-9563-4199-a4ac-2e26cd8f7276'::uuid, '1604fba4-2f7d-4ef3-b795-7494cd3c17e7'::uuid, '98c88b75-24d0-4ad0-af68-b3dc078c61cb'::uuid, 'b34a40ef-e163-41ee-8bee-582e1b189430'::uuid, '3fd5537e-7c51-486f-81aa-e9f9ec07065b'::uuid, 'a9db7a4a-264a-4a06-b923-5d998b21dba0'::uuid, '56e7cc7b-95c6-4b98-a58f-70c661bdd386'::uuid, 'fae9ca61-b7f6-4ef0-9f06-3e1ca386167f'::uuid, 'f016b4f4-bfb6-41b1-abf4-f1c75accea6a'::uuid, 'd89b021d-d3fc-4bcb-ae19-e0c844024aeb'::uuid, '849aa01e-fb34-4d70-8378-323f17c178c3'::uuid, '58fdb27b-c4cf-4194-a3fe-254319521920'::uuid, 'af5b8fe9-c034-4b55-8b30-09d506b5b053'::uuid, 'cc3045db-ead3-483c-bc54-a91656aab4d8'::uuid, '442d330f-9187-46e5-9c38-3acdf0828e9e'::uuid, '22d19f04-9ae1-44e3-9565-b32e85624d5d'::uuid, '17e430a1-1665-4821-8098-2210a33c87c6'::uuid, '92af1698-7db5-454e-b591-24bd56e9649b'::uuid, '4a69e8ce-3dc3-42a1-9289-2e29c8752d82'::uuid, 'ef813caa-7ef9-40d4-941c-dc7783f67632'::uuid, 'df264092-9597-428d-9eb5-0692a38e8259'::uuid, '9258c0ac-13b0-404a-8437-45d519b1632d'::uuid, 'b3a509b4-15e3-43bf-903c-2eb98922e98a'::uuid, 'd9e226e4-913b-49a1-a858-44b3a1945eb8'::uuid, '717505d9-e1d3-47bf-bdda-74d14a04106a'::uuid, '1fb4402d-d1da-4f53-aca7-f4e08111a121'::uuid, '96f27f77-fbbc-4aee-ad3b-a5a082bd92e0'::uuid, 'a57e18e0-51e9-4e7e-b983-221e1b1673fd'::uuid, '969e9b7e-c251-4683-9d0a-d9234f56e944'::uuid, '6faad50a-7507-4ded-9400-918fad05ba90'::uuid, 'e1d384e3-9c01-40f0-af95-4a178b17e98e'::uuid, 'd7880533-75c9-46ad-a048-0b0f7dacc4db'::uuid);
