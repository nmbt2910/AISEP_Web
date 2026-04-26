/**
 * NotificationRouter.js
 * Centralizes the mapping logic for notification deep linking.
 * Maps backend ReferenceType to frontend dashboard routes and target actions.
 */

const NotificationRouter = {
    /**
     * Resolves the navigation instructions based on the notification payload and user role.
     * @param {string} referenceType - The type of entity the notification refers to.
     * @param {string|number} referenceId - The ID of the entity.
     * @param {object} user - Current user object with role information.
     * @returns {object|null} Navigation instructions { section, targetId, view } or null if invalid.
     */
    resolve: (referenceType, referenceId, user) => {
        if (!user || !referenceType) return null;

        const roleStr = user.role?.toString().toLowerCase() || '';
        const roleNum = Number(user.role);
        
        const isStartup = roleStr === 'startup' || roleNum === 0;
        const isInvestor = roleStr === 'investor' || roleNum === 1;
        const isAdvisor = roleStr === 'advisor' || roleNum === 2;
        const isStaff = roleStr === 'operationstaff' || roleStr === 'operation_staff' || roleStr === 'staff' || roleNum === 3;
        const isAdmin = roleStr === 'admin' || roleNum === 4;

        const type = referenceType.toString().toLowerCase();
        const id = referenceId ? referenceId.toString() : null;

        console.log(`[NotificationRouter] Resolving: type=${type}, id=${id}, role=${roleStr}`);

        switch (type) {
            case 'connectionrequest':
            case 'connection':
                if (isStartup) return { section: 'connection-requests', targetId: id };
                if (isInvestor) return { section: 'startup-requests', targetId: id };
                break;

            case 'chatsession':
            case 'chatmessage':
                if (isStartup) return { section: 'connection-requests', targetId: id };
                if (isInvestor) return { section: 'startup-requests', targetId: id };
                if (isAdvisor) return { section: 'overview', targetId: id };
                break;

            case 'deal':
            case 'investment':
                if (isStartup || isInvestor) return { section: 'deals', targetId: id };
                break;

            case 'booking':
            case 'appointment':
                if (isAdvisor) return { section: 'bookings', targetId: id };
                if (isInvestor) return { section: 'bookings', targetId: id };
                if (isStartup) return { section: 'bookings', targetId: id };
                if (isStaff) return { section: 'bookings', targetId: id };
                break;

            case 'startup':
            case 'project':
                if (isStaff) return { section: 'approvals', targetId: id };
                if (isStartup) return { section: 'my-projects', targetId: id };
                break;

            case 'advisor':
                if (isStaff) return { section: 'advisor_approval', targetId: id };
                if (isAdvisor) return { view: 'profile' };
                break;

            case 'investor':
                if (isStaff) return { section: 'investor_approval', targetId: id };
                break;

            case 'subscription':
                if (isStartup || isInvestor) return { section: 'subscription' };
                break;

            case 'consultingreport':
                if (isStartup) return { section: 'bookings', targetId: id }; // Open booking to see report
                if (isAdvisor) return { section: 'bookings', targetId: id };
                if (isStaff) return { section: 'bookings', targetId: id };
                break;

            case 'userreport':
            case 'report':
                if (isStaff) return { section: 'user_reports', targetId: id };
                break;

            default:
                break;
        }

        // Fallback for Admin
        if (isAdmin) return { section: 'overview' };

        return null;
    }
};

export default NotificationRouter;
