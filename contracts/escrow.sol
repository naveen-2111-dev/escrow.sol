// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title escrow
 * @dev A blockchain escrow system where the funds are locked and released. 
 * In case of a conflict, the company (arbitrator) resolves the issue and releases the funds.
 */
contract Escrow {
    address public _isOwner; 

    /**
     * @dev Struct to store the details of an escrow contract.
     */
    struct escrowContract {
        address buyer;
        address seller; 
        uint256 amount; 
        uint256 deadline; 
        bool isFunded; 
        bool isCompleted;
    }

    /**
     * @dev The constructor sets the deployer's address as the contract owner (Arbitrator).
     */
    constructor() {
        _isOwner = msg.sender;
    }

    // Mapping to store escrow contracts by their unique escrowId
    mapping(uint256 => escrowContract) public escrows;
    event EscrowCreated(uint256 escrowId, address buyer, address seller, uint256 amount, uint256 deadline);
    event FundsDeposited(uint256 escrowId, uint256 amount);
    event FundsReleased(uint256 escrowId);
    event FundsRefunded(uint256 escrowId);

    uint256 public escrowCounter; 

    /**
     * @dev Creates a new escrow contract.
     * @param _seller The address of the seller.
     * @param _deadline The deadline for the transaction in UNIX timestamp format.
     */
    function createEscrow(address _seller, uint256 _deadline) external payable {
        require(msg.value > 0, "Value should be greater than 0");
        uint256 escrowId = escrowCounter++; 

        escrows[escrowId] = escrowContract({
            buyer: msg.sender,
            seller: _seller,
            amount: msg.value,
            deadline: _deadline,
            isFunded: true,
            isCompleted: false
        });

        emit EscrowCreated(escrowId, msg.sender, _seller, msg.value, _deadline);
        emit FundsDeposited(escrowId, msg.value);
    }

    /**
     * @dev Allows the buyer to release the funds to the seller once the transaction is completed.
     * @param _escrowId The ID of the escrow contract.
     */
    function releaseFunds(uint256 _escrowId) external {
        escrowContract storage escrow = escrows[_escrowId];
        require(escrow.isFunded, "Funds are not deposited");
        require(!escrow.isCompleted, "Escrow is already completed");
        require(msg.sender == escrow.buyer, "Only the buyer can release funds");

        escrow.isCompleted = true;
        escrow.isFunded = false;

        payable(escrow.seller).transfer(escrow.amount);
        emit FundsReleased(_escrowId);
    }

    /**
     * @dev Allows the arbitrator (contract owner) to refund the buyer if the transaction is not completed by the deadline.
     * @param _escrowId The ID of the escrow contract.
     */
    function fundBuyer(uint256 _escrowId) external {
        escrowContract storage escrow = escrows[_escrowId];
        
        require(escrow.isFunded, "Funds are not deposited");
        require(!escrow.isCompleted, "Escrow is already completed");

        require(msg.sender == _isOwner || block.timestamp > escrow.deadline, "Unauthorized to refund");

        escrow.isCompleted = true;
        escrow.isFunded = false;

        payable(escrow.buyer).transfer(escrow.amount);

        emit FundsRefunded(_escrowId);
    }
}
