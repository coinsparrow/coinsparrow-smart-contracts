import
{
  increaseTimeTo,
  duration,
}
  from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

const Hashids = require('hashids');
const hashids = new Hashids('some salting', 16);

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const CoinSparrow = artifacts.require('CoinSparrow');

const STATUS_JOB_STARTED = 3; // Contractor flags job as started. Set by jobStarted()
const STATUS_JOB_COMPLETED = 5; // Contractor flags job as completed. Set by jobCompleted()

contract('CoinSparrow', function ([_owner, _hirer, _contractor,
  _newArbitrator, _withdrawAccount, _,
]) {
  let jobNum = 1000000000;
  let _jobId = hashids.encode(jobNum);
  const _value = new web3.BigNumber(web3.toWei(0.2, 'ether'));
  const _fee = _value.mul(0.01);
  const _jobStartWindow = 600;
  const MAX_SEND = 3;

  beforeEach(async function () {
    this.startTime = latestTime();
    this.agreedSecondsToComplete = duration.days(1);
    this.coinSparrow = await CoinSparrow.new(new web3.BigNumber(
      web3.toWei(MAX_SEND, 'ether')),
    {
      from: _owner,
    });
    jobNum++;
    //    _jobId = web3.fromAscii(hashids.encode(jobNum));
    _jobId = hashids.encode(jobNum);
    // console.log(_jobId);
  });

  /*
   * Contractor Specific
   */
  describe('Contractor Only Specific Functionality', function () {
    it('Contractor should be able to start work', async function () {
      await this.coinSparrow.createJobEscrow(_jobId,
        _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        })
        .should.be.fulfilled;

      await this.coinSparrow.jobStarted(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _contractor,
        })
        .should.be.fulfilled;

      var res = await this.coinSparrow.getJobStatus.call(
        _jobId, _hirer, _contractor, _value, _fee);
      res.toNumber()
        .should.be.equal(STATUS_JOB_STARTED);
    });

    it('Only Contractor can start work', async function () {
      await this.coinSparrow.createJobEscrow(_jobId,
        _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        })
        .should.be.fulfilled;

      // msg.sender != _contractor
      await this.coinSparrow.jobStarted(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _hirer,
        })
        .should.be.rejectedWith(EVMRevert);
    });

    it('Contractor should be able to complete work', async function () {
      await this.coinSparrow.createJobEscrow(_jobId,
        _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        })
        .should.be.fulfilled;

      await this.coinSparrow.jobStarted(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _contractor,
        })
        .should.be.fulfilled;

      await this.coinSparrow.jobCompleted(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _contractor,
        })
        .should.be.fulfilled;
      var res = await this.coinSparrow.getJobStatus.call(
        _jobId, _hirer, _contractor, _value, _fee);
      res.toNumber()
        .should.be.equal(STATUS_JOB_COMPLETED);
    });

    it('Only Contractor can complete work', async function () {
      await this.coinSparrow.createJobEscrow(_jobId,
        _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        })
        .should.be.fulfilled;

      await this.coinSparrow.jobStarted(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _contractor,
        })
        .should.be.fulfilled;

      // msg.sender != _contractor
      await this.coinSparrow.jobCompleted(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _hirer,
        })
        .should.be.rejectedWith(EVMRevert);

      // check status hasn't changed. Should still be "JOB_STARTED"
      var res = await this.coinSparrow.getJobStatus.call(
        _jobId, _hirer, _contractor, _value, _fee);
      res.toNumber()
        .should.be.equal(STATUS_JOB_STARTED);
    });
  });
});
