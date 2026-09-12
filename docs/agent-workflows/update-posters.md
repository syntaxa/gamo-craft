# Workflow команды `обнови постеры`

## Назначение
Импортировать все новые исходные изображения из `public/assets/posters/toadd` в действующий набор meme-постеров проекта после команды `обнови постеры`, распознанной без учета регистра.

## Порядок выполнения
1. Проверить содержимое `public/assets/posters/toadd`.
2. Подготовить runtime-изображения по действующему poster workflow проекта и сохранить их в `public/assets/posters/transparent`.
3. Добавить новые poster items в `src/content/catalogs/items.posters.v1.json`.
4. Добавить записи в таблицы `loot_meme_posters` (категория `cats`) или `loot_sbear_posters` (категория `sbearadventure`) файла `src/content/catalogs/lootTables.v1.json` в зависимости от категории новых poster items.
5. Удалить исходные изображения из `public/assets/posters/toadd` только после успешного добавления runtime-ассетов и обновления каталогов.
6. Проверить, нужны ли сопутствующие изменения документации проекта; при необходимости внести их без changelog-блоков.

## Границы поведения
- Команда применяется только к папке `public/assets/posters/toadd`.
- Если папка отсутствует или пуста, явно сообщить, что импортировать нечего, и не менять каталоги.
- Не удалять исходные изображения до завершения всех необходимых изменений.
- Следовать действующему контракту проекта для poster items:
  - runtime-изображения хранятся локально;
  - poster items регистрируются в `src/content/catalogs/items.posters.v1.json`;
  - poster items категории `cats` дополнительно пополняют таблицу `loot_meme_posters` (награды `Котового яйца`);
  - poster items категории `sbearadventure` дополнительно пополняют таблицу `loot_sbear_posters` (награды `Яйца Super bear`).
