# Composio mail tool input schemas (fetched live 2026-07-19)

> Ground truth for the Mail module. Args objects passed to ComposioGateway.executeTool must use EXACTLY these parameter names.

## GMAIL_FETCH_EMAILS
  - query: string [default: null] — Gmail advanced search query (e.g., 'from:user subject:meeting'). Supports operators like 'from:', 'to:', 'subject:', 'label:', 'has:attachme
  - user_id: string [default: "me"] — User's email address or 'me' for the authenticated user.
  - verbose: boolean [default: true] — If false, uses optimized concurrent metadata fetching for faster performance (~75% improvement). If true, uses standard detailed message fet
  - ids_only: boolean [default: false] — If true, only returns message IDs from the list API without fetching individual message details. Fastest option for getting just message IDs
  - label_ids: array — Filter by label IDs; only messages with all specified labels are returned. Common IDs: 'INBOX', 'SPAM', 'TRASH', 'UNREAD', 'STARRED', 'IMPOR
  - page_token: string [default: null] — Token for retrieving a specific page, obtained from a previous response's `nextPageToken`. Omit for the first page.
  - max_results: integer [default: 1] — Maximum number of messages to retrieve per page.
  - include_payload: boolean [default: true] — Set to true to include full message payload (headers, body, attachments); false for metadata only.
  - include_spam_trash: boolean [default: false] — Set to true to include messages from 'SPAM' and 'TRASH'.

## GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID
  - format: string [default: "full"] — Format for message content: 'minimal' (ID/labels), 'full' (complete data), 'raw' (base64url string), 'metadata' (ID/labels/headers).
  - user_id: string [default: "me"] — User's email address or 'me' for the authenticated user.
  - message_id (REQUIRED): string — Unique ID of the email message to retrieve, obtainable from actions like 'List Messages'.

## GMAIL_FETCH_MESSAGE_BY_THREAD_ID
  - user_id: string [default: "me"] — The email address of the user.
  - thread_id (REQUIRED): string — Unique ID of the thread, obtainable from actions like 'listThreads' or 'fetchEmails'.
  - page_token: string [default: ""] — Opaque page token for fetching a specific page of messages if results are paginated.

## GMAIL_SEND_EMAIL
  - cc: array [default: []] — Carbon Copy (CC) recipients' email addresses.
  - bcc: array [default: []] — Blind Carbon Copy (BCC) recipients' email addresses.
  - body (REQUIRED): string — Email content (plain text or HTML); if HTML, `is_html` must be `True`.
  - is_html: boolean [default: false] — Set to `True` if the email body contains HTML tags.
  - subject: string [default: null] — Subject line of the email.
  - user_id: string [default: "me"] — User's email address; the literal 'me' refers to the authenticated user.
  - attachment: object — File to attach; ensure `s3key`, `mimetype`, and `name` are set if provided. Omit or set to null for no attachment.
  - recipient_email (REQUIRED): string — Primary recipient's email address.
  - extra_recipients: array [default: []] — Additional 'To' recipients' email addresses (not Cc or Bcc).

## GMAIL_REPLY_TO_THREAD
  - cc: array [default: []] — CC recipients' email addresses.
  - bcc: array [default: []] — BCC recipients' email addresses (hidden from other recipients).
  - is_html: boolean [default: false] — Indicates if `message_body` is HTML; if True, body must be valid HTML, if False, body should not contain HTML tags.
  - user_id: string [default: "me"] — Identifier for the user sending the reply; 'me' refers to the authenticated user.
  - thread_id (REQUIRED): string — Identifier of the Gmail thread for the reply.
  - attachment: object [default: null] — File to attach to the reply. Just Provide file path here
  - message_body (REQUIRED): string — Content of the reply message, either plain text or HTML.
  - recipient_email (REQUIRED): string — Primary recipient's email address.
  - extra_recipients: array [default: []] — Additional 'To' recipients' email addresses.

## GMAIL_MODIFY_THREAD_LABELS
  - user_id: string [default: "me"] — User's email address or 'me' for the authenticated user.
  - thread_id (REQUIRED): string — Immutable ID of the thread to modify.
  - add_label_ids: array [default: null] — List of label IDs to add to the thread; these labels must exist.
  - remove_label_ids: array [default: null] — List of label IDs to remove from the thread; these labels must exist.

## GMAIL_MOVE_TO_TRASH
  - user_id: string [default: "me"] — User's email address or 'me' for the authenticated user.
  - message_id (REQUIRED): string — Identifier of the email message to move to trash.

## GMAIL_GET_ATTACHMENT
  - user_id: string [default: "me"] — User's email address ('me' for authenticated user).
  - file_name (REQUIRED): string — Desired filename for the downloaded attachment.
  - message_id (REQUIRED): string — Immutable ID of the message containing the attachment.
  - attachment_id (REQUIRED): string — ID of the attachment to retrieve.

## GMAIL_GET_PROFILE
  - user_id: string [default: "me"] — The email address of the Gmail user whose profile is to be retrieved, or the special value 'me' to indicate the currently authenticated user

## GMAIL_LIST_THREADS
  - query: string [default: ""] — Filter for threads, using Gmail search query syntax (e.g., 'from:user@example.com is:unread').
  - user_id: string [default: "me"] — The user's email address or 'me' to specify the authenticated Gmail account.
  - verbose: boolean [default: false] — If false, returns threads with basic fields (id, snippet, historyId). If true, returns threads with complete message details including heade
  - page_token: string [default: ""] — Token from a previous response to retrieve a specific page of results; omit for the first page.
  - max_results: integer [default: 10] — Maximum number of threads to return.

## OUTLOOK_OUTLOOK_LIST_MESSAGES
  - top: integer [default: 10] — Maximum number of messages to return (1-1000).
  - skip: integer [default: 0] — Number of messages to skip from the beginning of the result set, for pagination.
  - folder: string [default: "inbox"] — ID or well-known name of the mail folder (e.g., 'Inbox', 'SentItems', 'Drafts', 'DeletedItems').
  - select: array — List of message properties to include. Each item is a property name like 'subject', 'from', or 'receivedDateTime'. MUST be provided as a lis
  - is_read: boolean [default: null] — Filter by read status: 'true' for read, 'false' for unread. Unspecified means no filter by read status.
  - orderby: array [default: ["receivedDateTime desc"]] — List of properties to sort results by, with direction. Each item is a string like 'receivedDateTime desc' or 'subject asc'. MUST be provided
  - subject: string [default: null] — Filter by exact match of the subject line.
  - user_id: string [default: "me"] — Target user's email or 'me' for authenticated user. For delegated access, use shared mailbox or delegated user's email.
  - categories: array — Filter by categories (case-sensitive); matches if tagged with any specified category.
  - importance: string [default: null] — Filter by importance: 'low', 'normal', or 'high'.
  - from_address: string [default: null] — Filter by the sender's exact email address.
  - conversationId: string [default: null] — Filter messages by conversation ID to retrieve all messages in a specific email thread.
  - has_attachments: boolean [default: null] — Filter by attachment presence: 'true' for messages with attachments, 'false' for those without.
  - subject_contains: string [default: null] — Filter messages where the subject contains the specified case-insensitive substring.
  - subject_endswith: string [default: null] — Filter messages where the subject ends with the specified case-insensitive string.
  - sent_date_time_gt: string [default: null] — Filter messages sent after this ISO 8601 timestamp.
  - sent_date_time_lt: string [default: null] — Filter messages sent before this ISO 8601 timestamp.
  - subject_startswith: string [default: null] — Filter messages where the subject starts with the specified case-insensitive string.
  - received_date_time_ge: string [default: null] — Filter messages received on or after this ISO 8601 timestamp.
  - received_date_time_gt: string [default: null] — Filter messages received after this ISO 8601 timestamp (e.g., '2023-01-01T00:00:00Z').
  - received_date_time_le: string [default: null] — Filter messages received on or before this ISO 8601 timestamp.
  - received_date_time_lt: string [default: null] — Filter messages received before this ISO 8601 timestamp.

## OUTLOOK_OUTLOOK_GET_MESSAGE
  - select: string [default: null] — Comma-separated list of properties to include. Use 'internetMessageHeaders' to get email headers for filtering automated messages.
  - user_id: string [default: "me"] — User's email address, UPN, or 'me' for the currently authenticated user.
  - message_id (REQUIRED): string — Unique ID of the Outlook email message to retrieve.

## OUTLOOK_OUTLOOK_SEND_EMAIL
  - body (REQUIRED): string — The content of the email body, plain text or HTML based on `is_html`.
  - is_html: boolean [default: false] — Specifies if the email body is HTML; `True` for HTML, `False` for plain text.
  - subject (REQUIRED): string — The subject line of the email.
  - to_name: string [default: null] — The display name of the primary recipient.
  - user_id: string [default: "me"] — The user's email address or the alias 'me' to represent the authenticated user.
  - to_email (REQUIRED): string — The primary recipient's email address.
  - cc_emails: array [default: []] — List of email addresses for CC recipients.
  - attachment: object [default: null] — Optional file to attach. If provided, its name, mimetype, and content must be valid and non-empty.
  - bcc_emails: array [default: []] — List of email addresses for BCC recipients.
  - save_to_sent_items: boolean [default: true] — Indicates if the email should be saved in 'Sent Items'.

## OUTLOOK_OUTLOOK_REPLY_EMAIL
  - comment (REQUIRED): string — The plain text body of the reply email.
  - user_id: string [default: "me"] — The user's email address or 'me' to indicate the authenticated user. This specifies the mailbox from which the reply will be sent.
  - cc_emails: array [default: []] — List of email addresses for CC recipients.
  - bcc_emails: array [default: []] — List of email addresses for BCC recipients.
  - message_id (REQUIRED): string — The unique ID of the message to reply to. This ID can be obtained from the `OUTLOOK_LIST_MESSAGES` action.

## OUTLOOK_OUTLOOK_UPDATE_EMAIL
  - body: object [default: null] — New body content (Text or HTML). If omitted, the existing message body remains unchanged.
  - subject: string [default: ""] — New subject. Omitting or providing an empty string clears the subject. To preserve the current subject, provide its existing value.
  - user_id: string [default: "me"] — The UPN (User Principal Name) of the user whose mailbox contains the message, or 'me' for the currently authenticated user. This determines 
  - importance: string [default: "normal"] — New importance level ('low', 'normal', 'high'). If omitted, importance is set to 'normal'.
  - message_id (REQUIRED): string — The unique identifier of the email message to be updated. This ID is typically obtained from listing messages or creating/sending a message.
  - cc_recipients: array — List of CC recipients; replaces all existing CCs. Omitting this field removes all current CC recipients.
  - to_recipients: array — List of TO recipients; replaces all existing TOs. Omitting this field removes all current TO recipients.
  - bcc_recipients: array — List of BCC recipients; replaces all existing BCCs. Omitting this field removes all current BCC recipients.

## OUTLOOK_OUTLOOK_MOVE_MESSAGE
  - user_id: string [default: "me"] — User's email address, UPN, or 'me' for the currently authenticated user.
  - message_id (REQUIRED): string — Unique ID of the Outlook email message to move.
  - destination_id (REQUIRED): string — The destination folder ID, or a well-known folder name (e.g., 'inbox', 'deleteditems', 'drafts', 'sentitems').

## OUTLOOK_OUTLOOK_SEARCH_MESSAGES
  - size: integer [default: 25] — The maximum number of search results to return in a single response for pagination.
  - query (REQUIRED): string — The free-text search string. Can include terms from the message body, attachments, sender, subject, or other properties.
  - subject: string [default: null] — Text to search for within the message subject line.
  - fromEmail: string [default: null] — The sender's email address to filter messages; only Microsoft 365/Enterprise domains are supported.
  - from_index: integer [default: 0] — The 0-based starting index for the returned search results for pagination.
  - hasAttachments: boolean [default: null] — Filters messages based on the presence of attachments.
  - enable_top_results: boolean [default: false] — If `true`, sorts results by relevance; otherwise, sorts by date in descending order (newest first).

## OUTLOOK_OUTLOOK_LIST_MAIL_FOLDERS
  - user_id: string [default: "me"] — User's id, userPrincipalName, or 'me' for the signed-in user.
  - include_hidden_folders: boolean [default: false] — Include hidden mail folders (isHidden=true) when set to true.

## OUTLOOK_DOWNLOAD_OUTLOOK_ATTACHMENT
  - user_id: string [default: "me"] — The user's UPN (User Principal Name) or 'me' for the authenticated user. This identifies the mailbox where the message is located.
  - file_name (REQUIRED): string — The desired filename for the downloaded attachment. This name will be assigned to the `FileDownloadable` object.
  - message_id (REQUIRED): string — The unique identifier of the email message that contains the attachment to be downloaded. This ID is typically obtained when listing or retr
  - attachment_id (REQUIRED): string — The unique identifier of the attachment to be downloaded. This ID is typically obtained from the message's details when an email message obj

## OUTLOOK_LIST_OUTLOOK_ATTACHMENTS
  - user_id: string [default: "me"] — The unique identifier of the user. Use the user's UPN (e.g., 'AdeleV@contoso.onmicrosoft.com') or 'me' for the currently authenticated user.
  - message_id (REQUIRED): string — The unique identifier of the email message from which to retrieve attachments. This ID is specific to the Outlook message.

## OUTLOOK_OUTLOOK_GET_PROFILE
  - user_id: string [default: "me"] — The user's unique identifier or principal name. Use 'me' to get the profile of the authenticated user.
