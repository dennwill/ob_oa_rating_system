// Utility functions for authentication and authorization

/**
    * Extract user information from request headers (set by middleware)
    * @param {Request} request - The incoming request object
    * @returns {Object} User information
*/
export function getUserFromRequest(request) {
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    const userType = request.headers.get('x-user-type');
    const isAdmin = request.headers.get('x-is-admin') === 'true';
  
    if (!userId || !userEmail) {
        throw new Error('User information not found in request headers');
    }
  
    return {
        id: parseInt(userId),
        email: userEmail,
        userType,
        isAdmin
    };
}
  
  /**
   * Check if the current user is an admin
   * @param {Request} request - The incoming request object
   * @returns {boolean} True if user is admin
   */
export function isAdmin(request) {
    try {
      const user = getUserFromRequest(request);
      return user.isAdmin;
    } catch (error) {
      return false;
    }
}
  
  /**
   * Check if the current user is an employee
   * @param {Request} request - The incoming request object
   * @returns {boolean} True if user is employee
   */
export function isEmployee(request) {
    try {
        const user = getUserFromRequest(request);
        return !user.isAdmin;
    } catch (error) {
        return false;
    }
}
  
  /**
   * Require admin access - throws error if user is not admin
   * @param {Request} request - The incoming request object
   * @returns {Object} User information
   */
export function requireAdmin(request) {
    const user = getUserFromRequest(request);
    
    if (!user.isAdmin) {
        throw new Error('Admin access required');
    }
    
    return user;
}
  
  /**
   * Require employee access - throws error if user is not employee
   * @param {Request} request - The incoming request object
   * @returns {Object} User information
   */
export function requireEmployee(request) {
    const user = getUserFromRequest(request);
    
    if (user.isAdmin) {
        throw new Error('Employee access required');
    }
    
    return user;
}
  
  /**
   * Get current user information without role restrictions
   * @param {Request} request - The incoming request object
   * @returns {Object} User information
   */
export function getCurrentUser(request) {
    return getUserFromRequest(request);
}
  
  /**
Check if user can access a specific resource
   * @param {Request} request - The incoming request object
   * @param {number} resourceUserId - The user ID of the resource owner
   * @returns {boolean} True if user can access the resource
   */
export function canAccessResource(request, resourceUserId) {
    try {
        const user = getUserFromRequest(request);
        
        // Admins can access all resources
        if (user.isAdmin) return true;
        
        // Employees can only access their own resources
        return user.id === resourceUserId;
    } catch (error) {
        return false;
    }
}