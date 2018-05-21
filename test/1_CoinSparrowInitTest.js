import latestTime from './helpers/latestTime';
import
{
  increaseTimeTo,
  duration,
}
  from './helpers/increaseTime';
import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

const Hashids = require('hashids');
const hashids = new Hashids('some salting', 16);

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const CoinSparrow = artifacts.require('CoinSparrow');

contract('CoinSparrow', function ([_owner, _hirer, _contractor, _newArbitrator, _withdrawAccount, _]) {
  let jobNum = 1000000000;
  let _jobId = hashids.encode(jobNum);
  const _value = new web3.BigNumber(web3.toWei(0.2, 'ether'));
  const _fee = _value.mul(0.01);
  const _jobStartWindow = 600;
  const MAX_SEND = 3;

  beforeEach(async function () {
    this.startTime = latestTime();
    this.agreedSecondsToComplete = duration.days(1);
    this.coinSparrow = await CoinSparrow.new(new web3.BigNumber(web3.toWei(MAX_SEND, 'ether')), { from: _owner });
    jobNum++;
    _jobId = hashids.encode(jobNum);
  });

  /*
   * Job Escrow initialisation
   */
  describe('Job Escrow Initialisation', function () {
    /*
     * Should reject invalid parameters when creating job escrow
     */
    it('Should reject invalid parameters when creating job escrow: _value != msg.value', async function () {
      // _value != msg.value
      await this.coinSparrow.createJobEscrow(
        _jobId,
        _hirer,
        _contractor,
        _value,
        _fee,
        _jobStartWindow,
        this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value.add(new web3.BigNumber(web3.toWei(1, 'ether'))),
        }
      ).should.be.rejectedWith(EVMRevert);

      await this.coinSparrow.createJobEscrow(
        _jobId,
        _hirer,
        _contractor,
        _value.add(new web3.BigNumber(web3.toWei(1, 'ether'))),
        _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        }
      ).should.be.rejectedWith(EVMRevert);
    });

    it('Should reject invalid parameters when creating job escrow: hirer != msg.sender', async function () {
      // hirer != msg.sender
      await this.coinSparrow.createJobEscrow(
        _jobId,
        _owner,
        _contractor,
        _value,
        _fee,
        _jobStartWindow,
        this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        }
      ).should.be.rejectedWith(EVMRevert);
    });

    it('Should reject invalid parameters when creating job escrow: fee > value', async function () {
      // fee > value
      await this.coinSparrow.createJobEscrow(
        _jobId,
        _hirer,
        _contractor,
        _value,
        _value.add(new web3.BigNumber(web3.toWei(1, 'ether'))),
        _jobStartWindow,
        this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        }
      ).should.be.rejectedWith(EVMRevert);
    });

    it('Should reject invalid parameters when creating job escrow: jobStartWindow == 0', async function () {
      // jobStartWindow == 0
      await this.coinSparrow.createJobEscrow(
        _jobId,
        _hirer,
        _contractor,
        _value,
        _fee,
        0,
        this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        }
      ).should.be.rejectedWith(EVMRevert);
    });

    it('Should reject invalid parameters when creating job escrow: agreedSecondsToComplete <= 0', async function () {
      // agreedSecondsToComplete = 0
      await this.coinSparrow.createJobEscrow(
        _jobId,
        _hirer,
        _contractor,
        _value,
        _fee,
        _jobStartWindow,
        0,
        {
          from: _hirer,
          value: _value,
        }
      ).should.be.rejectedWith(EVMRevert);
    });

    it('Should reject invalid parameters when creating job escrow: value > MAX_SEND', async function () {
      // value > MAX_SEND
      await this.coinSparrow.createJobEscrow(
        _jobId,
        _hirer,
        _contractor,
        _value.add(new web3.BigNumber(web3.toWei(MAX_SEND, 'ether'))),
        _fee,
        _jobStartWindow,
        this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value.add(new web3.BigNumber(web3.toWei(MAX_SEND, 'ether'))),
        }
      ).should.be.rejectedWith(EVMRevert);
    });

    /*
     * Should only be able to create job escrow once
     */
    it('Should only be able to create job escrow once', async function () {
      await this.coinSparrow.createJobEscrow(
        _jobId,
        _hirer,
        _contractor,
        _value,
        _fee,
        _jobStartWindow,
        this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        }
      ).should.be.fulfilled;

      // create again with same parameters
      await this.coinSparrow.createJobEscrow(
        _jobId,
        _hirer,
        _contractor,
        _value,
        _fee,
        _jobStartWindow,
        this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        }
      ).should.be.rejectedWith(EVMRevert);
    });

    /*
     * Cannot create new Job when contract is paused
     */
    it('Cannot create new Job when contract is paused', async function () {
      await this.coinSparrow.pause({ from: _owner }).should.be.fulfilled;

      // try to create new job
      await this.coinSparrow.createJobEscrow(
        _jobId,
        _hirer,
        _contractor,
        _value,
        _fee,
        _jobStartWindow,
        this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        }
      ).should.be.rejectedWith(EVMRevert);
    });
  });
});