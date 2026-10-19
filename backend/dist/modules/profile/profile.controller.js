import { getProfile } from "./profile.service.js";
export async function getMyProfile(req, res) {
    if (!req.userId) {
        res.status(401).json({
            message: "Authentication required",
        });
        return;
    }
    try {
        const profile = await getProfile(req.userId);
        if (!profile) {
            res.status(404).json({
                message: "User not found",
            });
            return;
        }
        res.json({
            profile,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Failed to fetch profile",
        });
    }
}
//# sourceMappingURL=profile.controller.js.map