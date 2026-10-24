// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ChainRescue
/// @notice A hackathon demo ledger for fictional emergency-assistance coordination.
/// @dev This contract deliberately has no funds, personal data, dispatch, or rewards.
contract ChainRescue {
    enum TaskCategory {
        MEDICAL,
        SHELTER,
        SUPPLIES,
        TRANSPORT,
        OTHER
    }

    enum TaskStatus {
        OPEN,
        CLAIMED,
        REPORTED,
        VERIFIED
    }

    struct AssistanceTask {
        uint256 id;
        TaskCategory category;
        string description;
        string fictionalArea;
        address creator;
        uint64 createdAt;
        TaskStatus status;
        address assignedVolunteer;
        address verifierOne;
        address verifierTwo;
    }

    error OnlyAdmin();
    error OnlyAssignedVolunteer();
    error OnlyAuthorizedVerifier();
    error TaskNotFound();
    error InvalidStatus(TaskStatus expected, TaskStatus actual);
    error EmptyField();
    error CreatorCannotClaim();
    error IneligibleVerifier();
    error DuplicateVerifier();

    address public immutable admin;
    uint256 private taskCount;
    mapping(uint256 => AssistanceTask) private tasks;
    mapping(address => bool) public authorizedVerifiers;

    event VerifierAuthorizationUpdated(address indexed verifier, bool authorized);
    event AssistanceTaskCreated(
        uint256 indexed taskId,
        address indexed creator,
        TaskCategory category,
        string description,
        string fictionalArea
    );
    event TaskClaimed(uint256 indexed taskId, address indexed volunteer);
    event CompletionReported(uint256 indexed taskId, address indexed volunteer);
    event TaskVerificationRecorded(uint256 indexed taskId, address indexed verifier, uint8 confirmationCount);
    event TaskFinalized(uint256 indexed taskId, address indexed verifierOne, address indexed verifierTwo);

    constructor(address initialAdmin) {
        require(initialAdmin != address(0), "admin is zero address");
        admin = initialAdmin;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    modifier existingTask(uint256 taskId) {
        if (taskId == 0 || taskId > taskCount) revert TaskNotFound();
        _;
    }

    /// @notice Demo administrator manages the independent verifier allowlist.
    function setVerifier(address verifier, bool authorized) external onlyAdmin {
        require(verifier != address(0), "verifier is zero address");
        authorizedVerifiers[verifier] = authorized;
        emit VerifierAuthorizationUpdated(verifier, authorized);
    }

    function createTask(
        TaskCategory category,
        string calldata description,
        string calldata fictionalArea
    ) external returns (uint256 taskId) {
        if (bytes(description).length == 0 || bytes(fictionalArea).length == 0) revert EmptyField();

        taskId = ++taskCount;
        tasks[taskId] = AssistanceTask({
            id: taskId,
            category: category,
            description: description,
            fictionalArea: fictionalArea,
            creator: msg.sender,
            createdAt: uint64(block.timestamp),
            status: TaskStatus.OPEN,
            assignedVolunteer: address(0),
            verifierOne: address(0),
            verifierTwo: address(0)
        });

        emit AssistanceTaskCreated(taskId, msg.sender, category, description, fictionalArea);
    }

    /// @notice Atomically reserves an open task for one volunteer.
    function claimTask(uint256 taskId) external existingTask(taskId) {
        AssistanceTask storage task = tasks[taskId];
        if (task.status != TaskStatus.OPEN) revert InvalidStatus(TaskStatus.OPEN, task.status);
        if (msg.sender == task.creator) revert CreatorCannotClaim();

        task.assignedVolunteer = msg.sender;
        task.status = TaskStatus.CLAIMED;
        emit TaskClaimed(taskId, msg.sender);
    }

    function reportCompletion(uint256 taskId) external existingTask(taskId) {
        AssistanceTask storage task = tasks[taskId];
        if (task.status != TaskStatus.CLAIMED) revert InvalidStatus(TaskStatus.CLAIMED, task.status);
        if (msg.sender != task.assignedVolunteer) revert OnlyAssignedVolunteer();

        task.status = TaskStatus.REPORTED;
        emit CompletionReported(taskId, msg.sender);
    }

    /// @notice Records a verifier confirmation and finalizes after the second independent one.
    function verifyTask(uint256 taskId) external existingTask(taskId) {
        AssistanceTask storage task = tasks[taskId];
        if (task.status != TaskStatus.REPORTED) revert InvalidStatus(TaskStatus.REPORTED, task.status);
        if (!authorizedVerifiers[msg.sender]) revert OnlyAuthorizedVerifier();
        if (msg.sender == task.creator || msg.sender == task.assignedVolunteer) revert IneligibleVerifier();
        if (msg.sender == task.verifierOne) revert DuplicateVerifier();

        if (task.verifierOne == address(0)) {
            task.verifierOne = msg.sender;
            emit TaskVerificationRecorded(taskId, msg.sender, 1);
            return;
        }

        task.verifierTwo = msg.sender;
        task.status = TaskStatus.VERIFIED;
        emit TaskVerificationRecorded(taskId, msg.sender, 2);
        emit TaskFinalized(taskId, task.verifierOne, task.verifierTwo);
    }

    function getTask(uint256 taskId) external view existingTask(taskId) returns (AssistanceTask memory) {
        return tasks[taskId];
    }

    function getTaskCount() external view returns (uint256) {
        return taskCount;
    }
}
