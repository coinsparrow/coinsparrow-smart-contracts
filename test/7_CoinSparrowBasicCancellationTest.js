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
   * Basic Cancellation & Refunds
   */
  describe('Basic Cancellation & Refunds', function () {
    it(
      'Hirer should be able to cancel and get funds back after waiting time, if job has not started',
      async function () {
        const hirerPre = web3.eth.getBalance(_hirer);
        const hirerPreForGasCalc = hirerPre.minus(_value);

        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          })
          .should.be.fulfilled;

        await increaseTimeTo(latestTime() + _jobStartWindow +
          1);

        await this.coinSparrow.hirerCancel(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        const hirerPost = web3.eth.getBalance(_hirer);

        const gasCost = hirerPreForGasCalc.minus(hirerPost.minus(
          _value));

        hirerPre.minus(gasCost)
          .should.be.bignumber.equal(hirerPost);
      });

    it('Only Hirer can call hirerCancel', async function () {
      await this.coinSparrow.createJobEscrow(_jobId,
        _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        })
        .should.be.fulfilled;
      await increaseTimeTo(latestTime() + _jobStartWindow +
        1);

      await this.coinSparrow.hirerCancel(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _contractor,
        })
        .should.be.rejected;
      await this.coinSparrow.hirerCancel(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _owner,
        })
        .should.be.rejected;
      await this.coinSparrow.hirerCancel(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: 0x0,
        })
        .should.be.rejected;
      await this.coinSparrow.hirerCancel(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _hirer,
        })
        .should.be.fulfilled;
    });

    it('Hirer should not be able to double cancel', async function () {
      await this.coinSparrow.createJobEscrow(_jobId,
        _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        })
        .should.be.fulfilled;

      await increaseTimeTo(latestTime() + _jobStartWindow +
        1);

      await this.coinSparrow.hirerCancel(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _hirer,
        })
        .should.be.fulfilled;

      await this.coinSparrow.hirerCancel(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _hirer,
        })
        .should.be.rejected;
    });

    it(
      'Hirer should not be able to cancel before "job start window" waiting period',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          })
          .should.be.fulfilled;
        await this.coinSparrow.hirerCancel(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.rejectedWith(EVMRevert);
      });

    it('Hirer should not be able to cancel once job starts',
      async function () {
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
        await this.coinSparrow.hirerCancel(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.rejectedWith(EVMRevert);
      });

    it(
      'Hirer should not be able to cancel once job completed',
      async function () {
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
        await this.coinSparrow.hirerCancel(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.rejectedWith(EVMRevert);
      });

    it('Only Contractor can call contractorCancel', async function () {
      await this.coinSparrow.createJobEscrow(_jobId,
        _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        })
        .should.be.fulfilled;

      await this.coinSparrow.contractorCancel(_jobId,
        _hirer, _contractor, _value, _fee,
        {
          from: _hirer,
        })
        .should.be.rejected;
      await this.coinSparrow.contractorCancel(_jobId,
        _hirer, _contractor, _value, _fee,
        {
          from: _owner,
        })
        .should.be.rejected;
      await this.coinSparrow.contractorCancel(_jobId,
        _hirer, _contractor, _value, _fee,
        {
          from: 0x0,
        })
        .should.be.rejected;
      await this.coinSparrow.contractorCancel(_jobId,
        _hirer, _contractor, _value, _fee,
        {
          from: _contractor,
        })
        .should.be.fulfilled;
    });

    it(
      'Contractor should be able to cancel before job starts, and funds correctly returned',
      async function () {
        const hirerPre = web3.eth.getBalance(_hirer);
        const hirerPreForGasCalc = hirerPre.minus(_value);

        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          })
          .should.be.fulfilled;

        await this.coinSparrow.contractorCancel(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        const hirerPost = web3.eth.getBalance(_hirer);

        const gasCost = hirerPreForGasCalc.minus(hirerPost.minus(
          _value));

        hirerPre.minus(gasCost)
          .should.be.bignumber.equal(hirerPost);
      });

    it(
      'Contractor should be able to cancel after job starts, and funds correctly returned',
      async function () {
        const hirerPre = web3.eth.getBalance(_hirer);
        const hirerPreForGasCalc = hirerPre.minus(_value);

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
        await this.coinSparrow.contractorCancel(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        const hirerPost = web3.eth.getBalance(_hirer);

        const gasCost = hirerPreForGasCalc.minus(hirerPost.minus(
          _value));

        hirerPre.minus(gasCost)
          .should.be.bignumber.equal(hirerPost);
      });

    it(
      'Contractor should be able to cancel after job completed, and funds correctly returned',
      async function () {
        const hirerPre = web3.eth.getBalance(_hirer);
        const hirerPreForGasCalc = hirerPre.minus(_value);

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
        await this.coinSparrow.contractorCancel(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        const hirerPost = web3.eth.getBalance(_hirer);

        const gasCost = hirerPreForGasCalc.minus(hirerPost.minus(
          _value));

        hirerPre.minus(gasCost)
          .should.be.bignumber.equal(hirerPost);
      });

    it('Contractor should not be able to double cancel',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          })
          .should.be.fulfilled;

        await this.coinSparrow.contractorCancel(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.fulfilled;

        await this.coinSparrow.contractorCancel(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _contractor,
          })
          .should.be.rejected;
      });
  });
});
