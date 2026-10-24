import { expect } from "chai";
import hre from "hardhat";

const { ethers } = hre;

describe("ChainRescue", function () {
  async function deployFixture() {
    const [admin, creator, volunteer, verifierOne, verifierTwo, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ChainRescue");
    const chainRescue = await Factory.deploy(admin.address);
    await chainRescue.waitForDeployment();
    return { chainRescue, admin, creator, volunteer, verifierOne, verifierTwo, outsider };
  }

  async function createTask() {
    const fixture = await deployFixture();
    await fixture.chainRescue
      .connect(fixture.creator)
      .createTask(2, "Deliver water to fictional residents", "Demo District A");
    return fixture;
  }

  it("creates an open assistance task with its creator and metadata", async function () {
    const { chainRescue, creator } = await createTask();
    const task = await chainRescue.getTask(1);

    expect(task.id).to.equal(1);
    expect(task.creator).to.equal(creator.address);
    expect(task.category).to.equal(2);
    expect(task.description).to.equal("Deliver water to fictional residents");
    expect(task.fictionalArea).to.equal("Demo District A");
    expect(task.status).to.equal(0);
  });

  it("allows one volunteer to claim an open task", async function () {
    const { chainRescue, volunteer } = await createTask();
    await expect(chainRescue.connect(volunteer).claimTask(1))
      .to.emit(chainRescue, "TaskClaimed")
      .withArgs(1, volunteer.address);
    const task = await chainRescue.getTask(1);
    expect(task.status).to.equal(1);
    expect(task.assignedVolunteer).to.equal(volunteer.address);
  });

  it("rejects duplicate claims and self-claims by the task creator", async function () {
    const { chainRescue, creator, volunteer, outsider } = await createTask();
    await expect(chainRescue.connect(creator).claimTask(1)).to.be.revertedWithCustomError(
      chainRescue,
      "CreatorCannotClaim"
    );
    await chainRescue.connect(volunteer).claimTask(1);
    await expect(chainRescue.connect(outsider).claimTask(1)).to.be.revertedWithCustomError(
      chainRescue,
      "InvalidStatus"
    );
  });

  it("rejects completion reporting by anyone other than the assigned volunteer", async function () {
    const { chainRescue, creator, volunteer } = await createTask();
    await chainRescue.connect(volunteer).claimTask(1);
    await expect(chainRescue.connect(creator).reportCompletion(1)).to.be.revertedWithCustomError(
      chainRescue,
      "OnlyAssignedVolunteer"
    );
  });

  it("allows the assigned volunteer to report completion", async function () {
    const { chainRescue, volunteer } = await createTask();
    await chainRescue.connect(volunteer).claimTask(1);
    await expect(chainRescue.connect(volunteer).reportCompletion(1))
      .to.emit(chainRescue, "CompletionReported")
      .withArgs(1, volunteer.address);
    expect((await chainRescue.getTask(1)).status).to.equal(2);
  });

  it("rejects unauthorized, conflicted, and premature verification", async function () {
    const { chainRescue, admin, creator, volunteer, outsider } = await createTask();
    await expect(chainRescue.connect(outsider).verifyTask(1)).to.be.revertedWithCustomError(
      chainRescue,
      "InvalidStatus"
    );
    await chainRescue.connect(volunteer).claimTask(1);
    await chainRescue.connect(volunteer).reportCompletion(1);
    await chainRescue.connect(admin).setVerifier(outsider.address, true);
    await expect(chainRescue.connect(creator).verifyTask(1)).to.be.revertedWithCustomError(
      chainRescue,
      "OnlyAuthorizedVerifier"
    );
    await chainRescue.connect(admin).setVerifier(creator.address, true);
    await expect(chainRescue.connect(creator).verifyTask(1)).to.be.revertedWithCustomError(
      chainRescue,
      "IneligibleVerifier"
    );
  });

  it("rejects a duplicate verifier and finalizes after two independent authorized confirmations", async function () {
    const { chainRescue, admin, volunteer, verifierOne, verifierTwo } = await createTask();
    await chainRescue.connect(volunteer).claimTask(1);
    await chainRescue.connect(volunteer).reportCompletion(1);
    await chainRescue.connect(admin).setVerifier(verifierOne.address, true);
    await chainRescue.connect(admin).setVerifier(verifierTwo.address, true);

    await expect(chainRescue.connect(verifierOne).verifyTask(1))
      .to.emit(chainRescue, "TaskVerificationRecorded")
      .withArgs(1, verifierOne.address, 1);
    await expect(chainRescue.connect(verifierOne).verifyTask(1)).to.be.revertedWithCustomError(
      chainRescue,
      "DuplicateVerifier"
    );
    await expect(chainRescue.connect(verifierTwo).verifyTask(1))
      .to.emit(chainRescue, "TaskFinalized")
      .withArgs(1, verifierOne.address, verifierTwo.address);

    const task = await chainRescue.getTask(1);
    expect(task.status).to.equal(3);
    expect(task.verifierOne).to.equal(verifierOne.address);
    expect(task.verifierTwo).to.equal(verifierTwo.address);
  });

  it("rejects invalid lifecycle transitions", async function () {
    const { chainRescue, volunteer, verifierOne } = await createTask();
    await expect(chainRescue.connect(volunteer).reportCompletion(1)).to.be.revertedWithCustomError(
      chainRescue,
      "InvalidStatus"
    );
    await chainRescue.connect(volunteer).claimTask(1);
    await expect(chainRescue.connect(verifierOne).verifyTask(1)).to.be.revertedWithCustomError(
      chainRescue,
      "InvalidStatus"
    );
  });
});
