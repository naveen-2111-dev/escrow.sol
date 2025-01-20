const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Escrow", function () {
  async function deployContractAndSetVariables() {
    const Escrow = await ethers.getContractFactory("Escrow");
    const escrow = await Escrow.deploy();
    const [owner, buyer, seller] = await ethers.getSigners();

    return { escrow, owner, buyer, seller };
  }

  it("should deploy and set the owner correctly", async function () {
    const { escrow, owner } = await loadFixture(deployContractAndSetVariables);
    expect(await escrow._isOwner()).to.equal(owner.address);
  });

  it("should create an escrow successfully", async function () {
    const { escrow, buyer, seller } = await loadFixture(
      deployContractAndSetVariables
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
    const amount = ethers.parseEther("1");

    await expect(
      escrow
        .connect(buyer)
        .createEscrow(seller.address, deadline, { value: amount })
    )
      .to.emit(escrow, "EscrowCreated")
      .withArgs(0, buyer.address, seller.address, amount, deadline)
      .and.to.emit(escrow, "FundsDeposited")
      .withArgs(0, amount);

    const createdEscrow = await escrow.escrows(0);
    expect(createdEscrow.buyer).to.equal(buyer.address);
    expect(createdEscrow.seller).to.equal(seller.address);
    expect(createdEscrow.amount).to.equal(amount);
    expect(createdEscrow.deadline).to.equal(deadline);
    expect(createdEscrow.isFunded).to.be.true;
    expect(createdEscrow.isCompleted).to.be.false;
  });

  it("should release funds successfully", async function () {
    const { escrow, buyer, seller } = await loadFixture(
      deployContractAndSetVariables
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
    const amount = ethers.parseEther("1");

    await escrow
      .connect(buyer)
      .createEscrow(seller.address, deadline, { value: amount });

    const _escrowId = 0;

    await expect(escrow.connect(buyer).releaseFunds(_escrowId))
      .to.emit(escrow, "FundsReleased")
      .withArgs(_escrowId);

    const updatedEscrow = await escrow.escrows(_escrowId);
    expect(updatedEscrow.isFunded).to.be.false;
    expect(updatedEscrow.isCompleted).to.be.true;
  });

  //checks whether the fund is funded peoperly by checking the deadline if
  //not the owner of the contract[deployer/company] will resolve this and sends the fund
  //simulating the event with passeddeadline
  it("should refund the buyer if the deadline has passed", async function () {
    const { escrow, buyer, seller, owner } = await loadFixture(
      deployContractAndSetVariables
    );

    const pastDeadline = Math.floor(Date.now() / 1000) - 10;
    const amount = ethers.parseEther("1");

    await escrow
      .connect(buyer)
      .createEscrow(seller.address, pastDeadline, { value: amount });

    const escrowId = 0;

    await expect(escrow.connect(owner).fundBuyer(escrowId))
      .to.emit(escrow, "FundsRefunded")
      .withArgs(escrowId);

    const updatedEscrow = await escrow.escrows(escrowId);
    expect(updatedEscrow.isFunded).to.be.false;
    expect(updatedEscrow.isCompleted).to.be.true;
  });
});
