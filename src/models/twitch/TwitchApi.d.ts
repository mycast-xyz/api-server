export interface UserDto {
    // User’s broadcaster type: "partner", "affiliate", or "".
    broadcaster_type: UserBroadcasterType;
    // User’s channel description.
    description: string;
    // User’s display name.
    display_name: string;
    // User’s email address. Returned if the request includes the user:read:email scope.
    email: string;
    // User’s ID.
    id: string;
    // User’s login name.
    login: string;
    // URL of the user’s offline image.
    offline_image_url: string;
    // URL of the user’s profile image.
    profile_image_url: string;
    // User’s type: "staff", "admin", "global_mod", or "".
    type: string;
    // Total number of views of the user’s channel.
    view_count: number;
    // Date when the user was created.
    created_at: string;
}
export type UserBroadcasterType = 'partner' | 'affiliate' | '';
export type UserType = 'staff' | 'admin' | 'global_mod' | '';

export type VideoDto = {
    // Date when the video was created.
    created_at: string;
    // Description of the video.
    description: string;
    // Length of the video.
    duration: string;
    // ID of the video.
    id: string;
    // Language of the video.
    language: string;
    // A cursor value, to be used in a subsequent request to specify the starting point of the next set of results.
    pagination: string;
    // Date when the video was published.
    published_at: string;
    // Template URL for the thumbnail of the video.
    thumbnail_url: object;
    // Title of the video.
    title: string;
    // Type of video. Valid values: "upload", "archive", "highlight".
    type: string;
    // URL of the video.
    url: object;
    // ID of the user who owns the video.
    user_id: string;
    // Display name corresponding to user_id.
    user_name: string;
    // Number of times the video has been viewed.
    view_count: number;
    // Indicates whether the video is publicly viewable. Valid values: "public", "private".
    viewable: string;
};
