const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

exports.getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password'); // Ensure it's the right user
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      user: {
        name: user.name, // Ensure the correct fields are returned
        email: user.email,
        role: user.role,
        phone: user.phone,
      }
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user details (name, phone, email)
exports.updateUserDetails = async (req, res) => {
  try {
    const { name, phone } = req.body; // Extract details from the request body
    
    // Validate input (optional but recommended)
    if (!name || !phone ) {
      return res.status(400).json({ message: 'All fields (name, phone, email) are required' });
    }

    // Find the user by ID
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user details
    user.name = name;
    user.phone = phone;

    // Save updated user document to the database
    await user.save();

    // Return updated user details (excluding password for security)
    res.status(200).json({
      message: 'User details updated successfully',
      user: {
        name: user.name,
        phone: user.phone
      },
    });
  } catch (error) {
    console.error("Error updating user details:", error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


exports.upgradeToDriver = async (req, res) => {
  const userId = req.user.id; // Get the user ID from the authenticated request (from protect middleware)
  const adminEmail = process.env.ADMIN_EMAIL; // Admin email to notify

  try {
    // Fetch the user from the database by ID and exclude the password field from the result
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If the user already requested the upgrade, inform them
    if (user.roleUpgradeRequested) {
      return res.status(400).json({ message: 'Your upgrade request is already pending approval' });
    }

    // Set the 'roleUpgradeRequested' flag to true
    user.roleUpgradeRequested = true;
    await user.save();

    // Send email to admin for approval
    const subject = 'Request to Upgrade to Driver';
    const text = `User ${user.email} has requested to be upgraded to a driver. Please review and approve the request.`;
    await sendEmail("kgotatso909@gmail.com", subject, text);

    // Send confirmation email to the user
    const userSubject = 'Upgrade Request Received';
    const userText = `Hello ${user.name},\n\nYour request to be upgraded to a driver has been received. An admin will review and approve the request shortly.\n\nThank you.`;
    await sendEmail(user.email, userSubject, userText);

    return res.status(200).json({ message: 'Your request for an upgrade to driver has been sent for approval' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

