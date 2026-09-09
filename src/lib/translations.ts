export type Language = 'ja' | 'en';
export type LanguageSetting = 'auto' | 'ja' | 'en';

export const TRANSLATIONS = {
  ja: {
    // General / Common
    appName: 'Movie Manager',
    save: '保存',
    saving: '保存中...',
    saveSettings: '設定を保存する',
    cancel: 'キャンセル',
    edit: '編集',
    delete: '削除',
    back: '戻る',
    loading: '読み込み中...',
    unspecified: '-',
    all: 'すべて',
    confirmDelete: 'この動画の登録を削除しますか？この操作は取り消せません。',
    confirmResetData: '設定とすべての登録データを初期化しますか？しますか？この操作は取り消せません。',
    resetData: 'データ初期化',
    on: 'ON',
    off: 'OFF',

    // Fields
    field_title: 'タイトル',
    field_genre: 'カテゴリ',
    field_cast: '登場',
    field_cast_kana: '登場（ふりがな）',
    field_release_year: '公開年',
    field_release_date: '公開月日',
    field_release_full: '公開年月日',
    field_rating: '評価',
    field_comment: 'コメント',
    field_tags: 'タグ',
    field_custom_1_default: 'ユーザー定義項目1',
    field_custom_2_default: 'ユーザー定義項目2',
    field_custom_3_default: 'ユーザー定義項目3',
    field_file_path: '参照ファイルパス',
    field_duration: '動画の長さ',
    field_resolution: '画面サイズ',
    field_frame_rate: 'フレームレート',
    field_file_size: 'ファイルサイズ',

    // Navbar
    nav_settings: '設定',

    // Settings Modal
    settings_title: '設定',
    settings_section1: '1. ユーザー定義項目（最大3つまで）',
    settings_section2: '2. メイン項目の選択と項目の並び替え',
    settings_section2_desc: 'メインインデックスで使用する項目を1つ選択してください。「タイトル」「評価」以外はドラッグして表示順を変更できます。',
    settings_section3: '3. 言語設定',
    settings_lang_auto: '自動',
    settings_lang_ja: '日本語',
    settings_lang_en: 'English',
    settings_fixed_position: '位置固定',
    settings_custom_item1: '項目 1',
    settings_custom_item1_placeholder: '例: 監督',
    settings_custom_item2: '項目 2',
    settings_custom_item2_placeholder: '例: シリーズ',
    settings_custom_item3: '項目 3',
    settings_custom_item3_placeholder: '例: 受賞',
    settings_custom_display_in_list: '動画一覧に表示',

    // Key Item List Page (Main Index)
    key_list_title: '{key}一覧',
    key_list_items_count: '{count} 項目',
    key_list_movies_count: '{count} 本',
    key_list_empty: 'データが登録されていません',
    key_list_empty_desc: '動画ファイルを画面上にドロップして登録してください。',
    key_list_sort_label: 'ソート:',
    key_list_filter_clear: '絞り込み解除',
    key_list_text_display: 'テキスト表示',

    // Key Item Detail Form Modal
    key_modal_title: 'キー項目詳細編集',
    key_modal_key_value: 'キー項目値:',
    key_modal_cast_kana_label: '登場（ふりがな）',
    key_modal_cast_kana_placeholder: '例: たろう, はなこ, ぽち, ほっかいどう (カンマ区切り)',
    key_modal_rating_label: '評価',
    key_modal_tags_label: 'タグ',
    key_modal_tags_placeholder: '例: お気に入り, 名作 (カンマ区切り)',
    key_modal_cast_kana_note: '※{title}のすべての動画データに反映されます。',

    // Movies List Page
    movies_list_title: '動画一覧',
    movies_list_filtered_title: '{value} 動画一覧',
    movies_list_movies_count: '{count} 本',
    movies_list_empty: '動画がありません',
    movies_list_empty_desc: '画面上に動画ファイルをドロップして追加してください。',
    movies_list_empty_filter_desc: '絞り込み条件を変更して再度ご確認ください。',
    movies_list_detail_btn: '動画詳細',
    movies_list_group_badge: '{count} 本のグループ',
    movies_list_play_tooltip: 'クリックで動画再生',
    movies_list_filter_tag: 'タグ:',
    movies_list_filter_rating: '評価:',
    filter_by_year: '公開年「{year}年」で絞り込み',
    movies_list_rating_gte4: '★4以上',
    movies_list_rating_gte3: '★3以上',

    // Movie Detail Page
    detail_movie_not_found: '動画が見つかりませんでした',
    detail_back_to_list: '動画一覧へ戻る',
    detail_no_summary_img: 'サマリー画像なし',
    detail_group_title: 'グループ動画一覧 ({count}本)',
    detail_displaying: '表示中',
    detail_rating_label: '評価',

    // Movie Form Modal
    form_edit_title: '動画データ編集',
    form_add_title: '新規動画追加',
    form_no_summary_click: 'サマリー画像なし（クリックで動画再生）',
    form_generating_summary: 'デフォルトサマリー画像自動生成中...',
    form_play_capture_btn: '動画を再生してキャプチャ',
    form_manual_capture_disabled: 'この動画では手動画像キャプチャはできません',
    form_video_error: '動画ソースのロードに失敗しました。参照パスをご確認ください。',
    form_unsupported_format_notice: '画面内再生非対応形式のため、アプリ内での直接再生はできません。',
    form_open_os_player: 'OS標準プレイヤーで再生',
    form_ffmpeg_reextract: 'FFmpegでサマリー画像を自動抽出',
    form_back_to_preview: 'プレビューに戻る',
    form_rewind_5s: '5秒巻き戻し',
    form_forward_5s: '5秒早送り',
    form_frame_back: 'コマ戻し',
    form_frame_forward: 'コマ送り',
    form_frame_back_tooltip: 'コマ送り（1フレーム戻る）',
    form_frame_forward_tooltip: 'コマ送り（1フレーム進む）',
    form_rating_label: '評価',
    form_grouping_label: 'グループ化',
    form_grouping_desc: '同一タイトル・カテゴリ・{keyFields}・公開年月日の動画をグループ化',
    form_title_placeholder: '動画のタイトル',
    form_cast_placeholder: '例: 太郎, 花子, ぽち, 北海道 (カンマ区切り)',
    form_cast_kana_placeholder: '例: たろう, はなこ, ぽち, ほっかいどう (カンマ区切り)',
    form_genre_placeholder: '例: アクション, ドキュメンタリー',
    form_release_year_label: '公開年 (公開年月日)',
    form_release_year_placeholder: '例: 2025,20250915',
    form_release_date_label: '公開月日',
    form_release_date_placeholder: '例: 09-15,0915',
    form_comment_placeholder: '動画に関するメモやコメント',
    form_tags_placeholder: '例: お気に入り, 名作 (カンマ区切り)',

    // Drag & Drop Wrapper
    drag_drop_overlay_title: '動画ファイルをドロップ',
    drag_drop_overlay_desc: '項目入力フォームが自動で開きます',
    drag_drop_invalid_title: '非対応のファイル',
    drag_drop_invalid_file: '動画以外のファイルは登録できません。',

    untitled: '無題',
    play: '再生',
    pause: '一時停止',
    field_key_item: 'キー項目',

    // Errors & Player Messages
    error_title: 'エラー',
    error_file_not_found: '指定された動画ファイルが存在しません。',
    error_player_launch_failed: '動画プレイヤーの起動に失敗しました。',
    error_save_summary_failed: 'サマリー画像の保存に失敗しました。',
    error_video_play_failed: '動画の再生に失敗しました。ファイル形式または参照パスをご確認ください。',
    error_video_load_failed: '動画ソースのロードに失敗しました ({error})。参照パス: {path}',
    error_cannot_get_file_path: 'ファイルのパスが取得できませんでした。',

    // Tooltips & Filters
    settings_drag_to_reorder: 'ドラッグして並び替え',
    settings_reset_data_tooltip: '設定と登録済みデータをすべて初期化',
    rating_tooltip: '評価 {rating}',
    filter_by_field: '{field}「{value}」で絞り込み',
    filter_by_genre: 'カテゴリ「{value}」で絞り込み',
    filter_by_cast: '登場「{value}」で絞り込み',
  },
  en: {
    // English Translation (Defaulting to Japanese text as requested until translated by user)
    appName: 'Movie Manager',
    save: 'Save',
    saving: 'Saving...',
    saveSettings: 'Save Settings',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    back: 'Back',
    loading: 'Loading...',
    unspecified: '-',
    all: 'All',
    confirmDelete: 'Are you sure you want to delete this movie?',
    confirmResetData: 'Are you sure you want to reset settings and all registered movie data? This operation cannot be undone.',
    resetData: 'Reset Data',
    on: 'ON',
    off: 'OFF',

    // Fields
    field_title: 'Title',
    field_genre: 'Category',
    field_cast: 'Featuring',
    field_cast_kana: 'Featuring (Kana)',
    field_release_year: 'Release Year',
    field_release_date: 'Release Date',
    field_release_full: 'Release Date',
    field_rating: 'Rating',
    field_comment: 'Comment',
    field_tags: 'Tags',
    field_custom_1_default: 'User defined item 1',
    field_custom_2_default: 'User defined item 2',
    field_custom_3_default: 'User defined item 3',
    field_file_path: 'File Path',
    field_duration: 'Duration',
    field_resolution: 'Resolution',
    field_frame_rate: 'Frame Rate',
    field_file_size: 'File Size',

    // Navbar
    nav_settings: 'Settings',

    // Settings Modal
    settings_title: 'Settings',
    settings_section1: '1. User defined items (max 3)',
    settings_section2: '2. Select key item and sort items',
    settings_section2_desc: 'Select a key item to use in the main index. Items other than title and rating can be dragged to change the display order.',
    settings_section3: '3. Language',
    settings_lang_auto: 'Auto',
    settings_lang_ja: 'Japanese',
    settings_lang_en: 'English',
    settings_fixed_position: 'Fixed Position',
    settings_custom_item1: 'Item 1',
    settings_custom_item1_placeholder: 'e.g., Director',
    settings_custom_item2: 'Item 2',
    settings_custom_item2_placeholder: 'e.g., Series',
    settings_custom_item3: 'Item 3',
    settings_custom_item3_placeholder: 'e.g., Award',
    settings_custom_display_in_list: 'Show in video list',

    // Key Item List Page (Main Index)
    key_list_title: '{key} List',
    key_list_items_count: '{count} Items',
    key_list_movies_count: '{count} Movies',
    key_list_empty: 'No data registered',
    key_list_empty_desc: 'Drop video files on the screen to register them.',
    key_list_sort_label: 'Sort:',
    key_list_filter_clear: 'Clear Filter',
    key_list_text_display: 'Text View',

    // Key Item Detail Form Modal
    key_modal_title: 'Edit Key Item',
    key_modal_key_value: 'Key Item Value:',
    key_modal_cast_kana_label: 'Featuring (Kana)',
    key_modal_cast_kana_placeholder: 'e.g., John, Mary, Buddy, London (comma separated)',
    key_modal_rating_label: 'Rating',
    key_modal_tags_label: 'Tags',
    key_modal_tags_placeholder: 'e.g., Favorite, Masterpiece (comma separated)',
    key_modal_cast_kana_note: '* Will be applied to all video data for {title}.',

    // Movies List Page
    movies_list_title: 'Video List',
    movies_list_filtered_title: '{value} Video List',
    movies_list_movies_count: '{count} Movies',
    movies_list_empty: 'No movies',
    movies_list_empty_desc: 'Drop video files on the screen to add them.',
    movies_list_empty_filter_desc: 'Please change the filter conditions and check again.',
    movies_list_detail_btn: 'Video Detail',
    movies_list_group_badge: '{count} Movies in Group',
    movies_list_play_tooltip: 'Play Video',
    movies_list_filter_tag: 'Tags:',
    movies_list_filter_rating: 'Rating:',
    filter_by_year: 'Filter by release year "{year}"',
    movies_list_rating_gte4: '★4 and above',
    movies_list_rating_gte3: '★3 and above',

    // Movie Detail Page
    detail_movie_not_found: 'Video not found',
    detail_back_to_list: 'Back to List',
    detail_no_summary_img: 'No summary image',
    detail_group_title: 'Group Videos ({count} videos)',
    detail_displaying: 'Displaying',
    detail_rating_label: 'Rating',

    // Movie Form Modal
    form_edit_title: 'Edit Video Data',
    form_add_title: 'Add New Video',
    form_no_summary_click: 'No summary image (click to play video)',
    form_generating_summary: 'Generating default summary image...',
    form_play_capture_btn: 'Play video and capture',
    form_manual_capture_disabled: 'Manual image capture is unavailable for this video format',
    form_video_error: 'Failed to load video source. Please check the reference path.',
    form_unsupported_format_notice: 'In-app video playback is unsupported for legacy formats.',
    form_open_os_player: 'Play in OS Default Player',
    form_ffmpeg_reextract: 'Auto-extract summary via FFmpeg',
    form_back_to_preview: 'Back to Preview',
    form_rewind_5s: '-5s',
    form_forward_5s: '+5s',
    form_frame_back: 'Frame Back',
    form_frame_forward: 'Frame Forward',
    form_frame_back_tooltip: 'Step back 1 frame',
    form_frame_forward_tooltip: 'Step forward 1 frame',
    form_rating_label: 'Rating',
    form_grouping_label: 'Grouping',
    form_grouping_desc: 'Group videos with the same Title, Category, {keyFields}, and Release Date',
    form_title_placeholder: 'Video Title',
    form_cast_placeholder: 'e.g., John, Mary, Buddy, London (comma separated)',
    form_cast_kana_placeholder: 'e.g., John, Mary, Buddy, London (comma separated)',
    form_genre_placeholder: 'e.g., Action, Documentary',
    form_release_year_label: 'Release Year (YYYY,YYYYMMDD)',
    form_release_year_placeholder: 'e.g., 2025,20250915',
    form_release_date_label: 'Release Date (MM-DD,MMDD)',
    form_release_date_placeholder: 'e.g., 09-15,0915',
    form_comment_placeholder: 'Notes or comments about the video',
    form_tags_placeholder: 'e.g., Favorite, Masterpiece (comma separated)',

    // Drag & Drop Wrapper
    drag_drop_overlay_title: 'Drop video files',
    drag_drop_overlay_desc: 'The item input form will open automatically',
    drag_drop_invalid_title: 'Unsupported File',
    drag_drop_invalid_file: 'Only video files can be registered.',

    untitled: 'Untitled',
    play: 'Play',
    pause: 'Pause',
    field_key_item: 'Key Item',

    // Errors & Player Messages
    error_title: 'Error',
    error_file_not_found: 'The specified video file does not exist.',
    error_player_launch_failed: 'Failed to launch the video player.',
    error_save_summary_failed: 'Failed to save summary image.',
    error_video_play_failed: 'Failed to play video. Please check the file format or reference path.',
    error_video_load_failed: 'Failed to load video source ({error}). Reference path: {path}',
    error_cannot_get_file_path: 'Failed to get file path.',

    // Tooltips & Filters
    settings_drag_to_reorder: 'Drag to reorder',
    settings_reset_data_tooltip: 'Reset settings and all registered data',
    rating_tooltip: 'Rating {rating}',
    filter_by_field: 'Filter by {field}: "{value}"',
    filter_by_genre: 'Filter by category: "{value}"',
    filter_by_cast: 'Filter by cast: "{value}"',
  },
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS.ja;

/**
 * Get translation string by key and language, with optional template parameter replacements.
 * Example: t('key_list_movies_count', 'ja', { count: 5 }) => "5 本"
 */
export function t(key: TranslationKey, lang: Language = 'ja', params?: Record<string, string | number>): string {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.ja;
  let text: string = dict[key] || TRANSLATIONS.ja[key] || key;

  if (params) {
    for (const [pKey, pValue] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pValue));
    }
  }

  return text;
}
